<?php
namespace lib\manager;

use \lib\entities\ConfiturePackageMetadata;
use \lib\entities\ConfitureRepository;
use \lib\manager\LocalRepositoryManager;
use \RuntimeException;

class ConfitureRepositoryManager_localfs extends ConfitureRepositoryManager {
	const CONFIG_DIR = '/etc/confiture';
	const CACHE_DIR = '/var/cache/confiture';
	const REMOVE_SCRIPTS_DIR = '/var/lib/confiture/remove-scripts';

	protected function _buildPackageMetadata($pkgData, $repoName) {
		$pkgData['updateDate'] = strtotime($pkgData['updateDate']);
		$pkgData['repository'] = $repoName;

		return new ConfiturePackageMetadata($pkgData);
	}

	protected function _buildRepository($repoData) {
		return new ConfitureRepository($repoData);
	}

	// GETTERS
	
	protected function _configFilePath() {
		return self::CONFIG_DIR . '/sources.json';
	}

	protected function _configFile() {
		return new \lib\JsonConfig($this->dao->toInternalPath($this->_configFilePath()));
	}

	protected function _indexCachePath($repoName) {
		return self::CACHE_DIR . '/indexes/' . $repoName . '.json';
	}

	protected function _indexCache($repoName) {
		return new \lib\JsonConfig($this->dao->toInternalPath($this->_indexCachePath($repoName)));
	}

	protected function _metadataCachePath($repoName) {
		return self::CACHE_DIR . '/metadata/' . $repoName . '.json';
	}

	protected function _metadataCache($repoName) {
		return new \lib\JsonConfig($this->dao->toInternalPath($this->_metadataCachePath($repoName)));
	}

	// Repositories

	public function listRepositories() {
		$configFile = $this->_configFile();
		$config = $configFile->read();

		$reposList = array();

		foreach ($config as $repoName => $repoConfig) {
			if (!isset($repoConfig['url']) || empty($repoConfig['url'])) {
				continue;
			}

			$reposList[$repoName] = $this->_buildRepository(array(
				'name' => $repoName,
				'url' => $repoConfig['url']
			));
		}

		return $reposList;
	}

	public function countRepositories() {
		$repos = $this->listRepositories();

		return count($repos);
	}

	public function getRepository($repoName) {
		$repos = $this->listRepositories();

		if (!isset($repos[$repoName])) {
			return null;
		}

		return $repos[$repoName];
	}

	public function repositoryExists($repoName) {
		$repos = $this->listRepositories();

		return isset($repos[$repoName]);
	}

	// Packages

	public function listAll() {
		$repos = $this->listRepositories();

		$list = array();

		foreach($repos as $repo) {
			$list += $this->listByRepository($repo['name']);
		}

		return $list;
	}

	public function countAll() {
		$repos = $this->listRepositories();
		$count = 0;

		foreach($repos as $repo) {
			$count += $this->countInRepository($repo['name']);
		}

		return $count;
	}

	public function getByName($pkgName) {
		$repos = $this->listRepositories();

		$foundPkg = null;

		foreach($repos as $repo) {
			$pkg = $this->getByRepository($repo['name'], $pkgName);
			if (empty($foundPkg)) {
				$foundPkg = $pkg;
			}
		}

		return $foundPkg;
	}

	public function listByRepository($repoName) {
		$this->_autoUpdateCache($repoName);

		$indexFile = $this->_indexCache($repoName);
		$indexes = $indexFile->read();
		$list = array();

		foreach($indexes as $index) {
			$list[] = $this->_buildPackageMetadata($index, $repoName);
		}

		return $list;
	}

	public function getByRepository($repoName, $pkgName) {
		$this->_autoUpdateCache($repoName);

		$indexFile = $this->_indexCache($repoName);
		$indexes = $indexFile->read();

		foreach($indexes as $index) {
			if ($index['name'] == $pkgName) {
				return $this->_buildPackageMetadata($index, $repoName);
			}
		}

		return null;
	}

	public function exists($pkgName) {
		$repos = $this->listRepositories();

		foreach($repos as $repo) {
			if ($this->existsInRepository($repo['name'], $pkgName)) {
				return true;
			}
		}

		return false;
	}

	public function existsInRepository($repoName, $pkgName) {
		$this->_autoUpdateCache($repoName);

		$indexFile = $this->_indexCache($repoName);
		$indexes = $indexFile->read();

		foreach($indexes as $index) {
			if ($index['name'] == $pkgName) {
				return true;
			}
		}

		return false;
	}

	public function countInRepository($repoName) {
		$this->_autoUpdateCache($repoName);

		$indexFile = $this->_indexCache($repoName);
		$indexes = $indexFile->read();

		return count($indexes);
	}

	// SETTERS

	// Repositories

	protected function _updateRepository(ConfitureRepository $repo) {
		$configFile = $this->_configFile();
		$config = $configFile->read();

		$config[$repo['name']] = array(
			'url' => $repo['url']
		);

		$configFile->write($config);
	}

	protected function _getRepositoryMetadata($repoUrl) {
		$metadataFile = $repoUrl . '/metadata.json';

		//Open remote metadata file
		$json = file_get_contents($metadataFile);
		if ($json === false) {
			throw new RuntimeException('Cannot open repository metadata file : "'.$metadataFile.'"');
		}

		$metadata = json_decode($json, true); //Decode JSON data
		if (empty($metadata) || json_last_error() != JSON_ERROR_NONE) {
			throw new RuntimeException('Cannot load repository metadata file (malformed JSON) : "'.$metadataFile.'"');
		}

		//Check that kind and specification fields are present
		if (!isset($metadata['kind']) || !isset($metadata['specification'])) {
			throw new RuntimeException('Cannot load repository metadata file (metadata must contain at least keys "kind" and "specification") : "'.$metadataFile.'"');
		}

		return $metadata;
	}

	protected function _updateRepositoryMetadata(ConfitureRepository $repo) {
		$metadata = $this->_getRepositoryMetadata($repo['url']);
		$cacheFile = $this->_metadataCache($repo['name']);

		if ($metadata['kind'] != 'symbiose') {
			throw new RuntimeException('Invalid repository metadata file (this is a confiture repository, but not for this webos) : "'.$repo['url'].'"');
		}

		if ($metadata['specification'] != '1.0') {
			throw new RuntimeException('Invalid repository metadata file (confiture specification "'.$metadata['specification'].'" not supported) : "'.$repo['url'].'"');
		}

		$cacheFile->write($metadata);
	}

	protected function _updateRepositoryIndex(ConfitureRepository $repo) {
		$indexFile = $repo['url'] . '/index.json';
		$cacheFile = $this->_indexCache($repo['name']);

		//Open remote index file
		$json = file_get_contents($indexFile);
		if ($json === false) {
			throw new RuntimeException('Cannot open repository index file : "'.$indexFile.'"');
		}

		$index = json_decode($json, true); //Decode JSON data
		if (json_last_error() != JSON_ERROR_NONE) {
			throw new RuntimeException('Cannot load repository index file (malformed JSON) : "'.$indexFile.'"');
		}

		$cacheFile->write($index);
	}

	protected function _autoUpdateCache($repoName) {
		$indexFilePath = $this->_indexCachePath($repoName);

		if (!$this->dao->exists($indexFilePath)) {
			$repo = $this->getRepository($repoName);

			if (empty($repo)) {
				throw new RuntimeException('Cannot find the repository with the name "'.$repo['name'].'"');
			}

			$this->updateRepositoryCache($repo);
		}
	}

	public function updateRepositoryCache(ConfitureRepository $repo) {
		$this->_updateRepositoryIndex($repo);
	}

	public function insertRepository(ConfitureRepository $repo) {
		if ($this->repositoryExists($repo['name'])) {
			throw new RuntimeException('Cannot insert repository "'.$repo['name'].'" : name already used');
		}

		$this->_updateRepositoryMetadata($repo);

		return $this->_updateRepository($repo);
	}

	public function updateRepository(ConfitureRepository $repo) {
		if (!$this->repositoryExists($repo['name'])) {
			throw new RuntimeException('Cannot find the repository with the name "'.$repo['name'].'"');
		}

		$this->_updateRepositoryMetadata($repo);

		return $this->_updateRepository($repo);
	}

	public function deleteRepository($repoName) {
		$configFile = $this->_configFile();
		$config = $configFile->read();

		if (!isset($config[$repoName])) {
			throw new RuntimeException('Cannot find the repository with the name "'.$repo['name'].'"');
		}

		unset($config[$repoName]);

		$configFile->write($config);

		$this->dao->delete($this->_indexCachePath($repoName));
		$this->dao->delete($this->_metadataCachePath($repoName));
	}

	// Packages
	
	protected function _mergeTrees($tree1, $tree2) {
		$mergedTree = $tree1;

		foreach ($tree2 as $depName => $dep) {
			if (!isset($mergedTree[$depName])) {
				$mergedTree[$depName] = $dep;
			} else {
				$mergedTree[$depName] = $this->_mergeDependencies($mergedTree[$depName], $dep);
			}
		}

		return $mergedTree;
	}

	protected function _mergeDependencies($dep1, $dep2) {
		if ($dep1['name'] != $dep2['name']) {
			return null;
		}

		$mergedDep = array_merge($dep1, $dep2);

		//If specific versions are specified
		if (!empty($dep1['maxVersion']) && !empty($dep2['maxVersion'])) { //If both have a max. version
			//The max. version is the lower one
			if (version_compare($dep1['maxVersion'], $dep2['maxVersion'], '=')) { //If both versions are equivalent
				$mergedDep['maxVersion'] = $dep2['maxVersion']; //Keep this dependency's version

				//The max. operator is the more restrictive
				$mergedDep['maxVersionStrict'] = ($dep1['maxVersionStrict'] || $dep2['maxVersionStrict']);
			} else if (version_compare($dep1['maxVersion'], $dep2['maxVersion'], '>')) { //If the actual max. version is greater than this one
				//Keep this dependency's version and operator
				$mergedDep['maxVersion'] = $dep2['maxVersion'];
				$mergedDep['maxVersionStrict'] = $dep2['maxVersionStrict'];
			} else { //If the actual max. version is lower than this one
				$mergedDep['maxVersion'] = $dep1['maxVersion'];
				$mergedDep['maxVersionStrict'] = $dep1['maxVersionStrict'];
			}
		}
		if (!empty($dep1['minVersion']) && !empty($dep2['minVersion'])) { //If both have a min. version
			//The min. version is the greater one
			if (version_compare($dep1['minVersion'], $dep2['minVersion'], '=')) { //If both versions are equivalent
				$mergedDep['minVersion'] = $dep2['minVersion']; //Keep this dependency's version

				//The min. operator is the more restrictive
				$mergedDep['minVersionStrict'] = ($dep1['minVersionStrict'] || $dep2['minVersionStrict']);
			} else if (version_compare($dep1['minVersion'], $dep2['minVersion'], '>')) { //If the actual min. version is greater than this one
				$mergedDep['minVersion'] = $dep1['minVersion'];
				$mergedDep['minVersionStrict'] = $dep1['minVersionStrict'];
			} else { //If the actual min. version is lower than this one
				//Keep this dependency's version and operator
				$mergedDep['minVersion'] = $dep2['minVersion'];
				$mergedDep['minVersionStrict'] = $dep2['minVersionStrict'];
			}
		}

		//merge parents and levels
		$mergedDep['parents'] = array_merge($dep1['parents'], $dep2['parents']);
		$mergedDep['level'] = ($dep1['level'] > $dep2['level']) ? $dep1['level'] : $dep2['level'];

		return $mergedDep;
	}

	public function _compareDependenciesLevel($dep1, $dep2) {
		return $dep1['level'] - $dep2['level'];
	}

	protected function _createTreeNode($pkgName) {
		return array(
			'name' => $pkgName,
			'maxVersion' => null,
			'maxVersionStrict' => false,
			'minVersion' => null,
			'minVersionStrict' => false,
			'parents' => array(),
			'level' => 0
		);
	}

	protected function _calculateTree(ConfiturePackageMetadata $pkg, LocalRepositoryManager $localRepository) {
		$pkgName = $pkg->name(); //Package's name

		$tree = array(); //Package's tree

		$tree[$pkgName] = $this->_createTreeNode($pkgName); //Firstly, create this package's node

		//Here are allowed operators to target specific versions
		$operators = array(
			'<' => -2,
			'<=' => -1,
			'=' => 0,
			'>=' => 1,
			'>' => 2
		);

		$remoteRepositories = $this->listRepositories(); //Remote repositories

		//Then add dependencies
		$pkgDeps = $pkg->parseDepends();
		foreach ($pkgDeps as $dep) {
			$depToAdd = $this->_createTreeNode($dep['name']);

			$depToAdd['parents'][] = $pkgName;
			$depToAdd['level'] = 1;

			//If specific versions are specified
			if (isset($pkgDep['versionOperator']) && isset($pkgDep['version'])) {
				//Versionning support
				$pkgDepOperator = $operators[$pkgDep['operator']];

				if ($pkgDepOperator <= 0) { //If the operator is <, <= or =
					$depToAdd['maxVersion'] = $pkgDep['version'];
					$depToAdd['maxVersionStrict'] = ($pkgDep['operator'] <= -2);
				}
				if ($pkgDepOperator >= 0) { //If the operator is >, >= or =
					$depToAdd['minVersion'] = $pkgDep['version'];
					$depToAdd['minVersionStrict'] = ($pkgDep['operator'] >= 2);
				}
			}

			//Find dependency in repositories
			$depPkg = null;

			//Check if the requiered package is already installed
			$localPkg = $this->_resolveDependency($dep, $localRepository);
			if ($localPkg === null) { //No => we must download it from remote repositories
				$found = false;
				foreach($remoteRepositories as $repo) {
					$remotePkg = $this->_resolveDependency($dep, $repo);

					if ($remotePkg !== null) { //Package found
						$depPkg = $remotePkg;
						$found = true;
						break;
					}
				}

				if (!$found) { //Package not found, trigger an error
					throw new RuntimeException('Cannot resolve the dependency tree : package "'.$pkgName.'" requires "'.$dep['name'].$dep['versionOperator'].$dep['version'].'"');
				}
			} else {
				$depPkg = $localPkg;
			}

			//Then, calculate this dependency's tree
			$depTree = $this->_calculateTree($depPkg, $localRepository);
			foreach($depTree as $depsDepName => $depsDep) { //Add 1 to every dependencies' levels
				$depTree[$depsDepName]['level']++;
			}
			$depTree[$depToAdd['name']] = $depToAdd;

			$tree = $this->_mergeTrees($tree, $depTree); //Merge this dependency's tree and the final tree
		}

		uasort($tree, array($this, '_compareDependenciesLevel'));

		return $tree;
	}

	protected function _resolveDependency($dep, \lib\Repository $repo) {
		$pkg = $repo->getByName($dep['name']);

		if (isset($dep['minVersion']) && !version_compare($pkg->version(), $dep['minVersion'], $dep['minVersionOperator'])) {
			return;
		}
		if (isset($dep['maxVersion']) && !version_compare($pkg->version(), $dep['maxVersion'], $dep['maxVersionOperator'])) {
			return;
		}

		return $pkg;
	}

	protected function _getPkgRootPath(ConfiturePackageMetadata $package) {
		$pkgRepo = $this->getRepository($package->repository());

		if (empty($pkgRepo)) {
			throw new RuntimeException('Cannot find repository "'.$package->repository().'"');
		}

		return $pkgRepo->url() . '/packages/' . substr($package['name'], 0, 1) . '/' . $package['name'];
	}

	protected function _getPkgSourcePath(ConfiturePackageMetadata $package) {
		return $this->_getPkgRootPath($package).'/source.zip';
	}

	protected function _getPkgFiles(ConfiturePackageMetadata $package) {
		$filesPath = $this->_getPkgRootPath($package).'/files.json';

		$json = file_get_contents($filesPath);
		if ($json === false) {
			throw new \RuntimeException('Cannot open files list : "'.$filesPath.'"');
		}

		$list = json_decode($json, true);
		if ($list === false || json_last_error() != JSON_ERROR_NONE) { throw new \RuntimeException('Cannot load files list (malformed JSON) : "'.$filesPath.'"'); }

		$files = array();
		foreach($list as $path => $item) {
			if (substr($path, 0, 1) == '/') { $path = substr($path, 1); } //Remove / at the begining of the path
			$files[$path] = array(
				'md5sum' => (isset($item['md5sum'])) ? $item['md5sum'] : null,
				'noextract' => (isset($item['noextract']) && $item['noextract']) ? true : false
			);
		}

		return $files;
	}

	protected function _download(ConfiturePackageMetadata $package, $zipPath) {
		$sourceUrl = $this->_getPkgSourcePath($package);
		$source = fopen($sourceUrl, 'r'); //Source file

		if ($source === false) {
			throw new RuntimeException('Cannot open package\'s contents from repository "'.$sourceUrl.'"');
		}

		$dest = fopen($this->dao->toInternalPath($zipPath), 'w'); //Destination file

		if ($dest === false) {
			throw new \RuntimeException('Cannot create temporary file "'.$zipPath.'"');
		}

		$copiedBits = stream_copy_to_stream($source, $dest); //Now we can download the source's file...

		fclose($source);
		fclose($dest);

		if ($copiedBits == 0) { //Check if bytes have been copied
			throw new RuntimeException('Cannot copy package\'s contents from repository "'.$sourceUrl.'" to temporary file "'.$zipPath.'"');
		}
	}

	protected function _extract(ConfiturePackageMetadata $package, $zipPath, $pkgFiles, LocalRepositoryManager $localRepo) {
		//Check if the package is already installed
		$isUpgrade = false;
		if (($localPkg = $localRepo->getByName($package->name())) !== null) {
			$isUpgrade = true;
		}

		$zip = new \ZipArchive();
		$result = $zip->open($this->dao->toInternalPath($zipPath)); //Open the package's source
		
		if ($result !== true) {
			throw new RuntimeException('Cannot open package\'s contents from temporary file "'.$zipPath.'" : ZipArchive error #'.$result);
		}

		$filesToCopy = array();

		//Check if everything goes the right way, and store files to copy in an array
		for ($i = 0; $i < $zip->numFiles; $i++) { //For each file
			//Get info about it
			$itemStat = $zip->statIndex($i); //From the archive

			if (strpos($itemStat['name'], 'src/') !== 0) { //Not in "src/" directory
				continue;
			}

			$itemName = preg_replace('#^src/#', '', $itemStat['name']);

			if (empty($itemName) || substr($itemName, -1) == '/') { //Is this a directory ?
				continue;
			}

			if (!isset($pkgFiles[$itemName])) { //Is this in files list ?
				continue;
			}

			$itemPkgData = $pkgFiles[$itemName]; //From the package

			//Pre-check

			if ($itemPkgData['noextract']) { continue; } //Skip this item

			$itemDestPath = '/' . $itemName; //Here is the final file's destination

			//Add this file in the list
			$filesToCopy[$itemName] = array(
				'sourcePath' => $itemStat['name'],
				'name' => $itemName,
				'destPath' => $itemDestPath,
				'md5sum' => $itemPkgData['md5sum']
			);
		}

		//Now, extract files
		foreach($filesToCopy as $item) {
			//Re-create parent dirs if they are not
			$parentDir = $this->dao->dirname($item['destPath']);
			if (!$this->dao->isDir($parentDir)) {
				$this->dao->mkdir($parentDir, true);
			}

			//If the file already exists, do not overwrite it
			if ($this->dao->exists($item['destPath'])) {
				//Is the file owned by another package ?
				//TODO
				$fileData = $localRepo->getFile($item['name']);

				if (!empty($fileData)) {
					//Collision
					if ($fileData['pkg'] != $package->name()) {
						throw new RuntimeException('File collision detected: "'.$item['name'].'" is already provided by "'.$fileData['pkg'].'"');
					}

					//Check if the file must be upgraded
					if (!empty($item['md5sum']) && isset($fileData['md5sum']) && !empty($fileData['md5sum']) && $fileData['md5sum'] == $item['md5sum']) {
						continue; //Skip this file : not changed
					}
					//Check if the file was manually modified
					$destMd5 = md5_file($this->dao->toInternalPath($item['destPath'])); //Calculate the MD5 sum of the destination file
					if (!empty($fileData['md5sum']) && $fileData['md5sum'] != $destMd5) {
						continue; //Skip this file : manually modified
					}
				} else { //File not provided by another pkg, maybe manually modified
					continue; //Skip this file
				}
			}

			$itemSource = $zip->getStream($item['sourcePath']); //Get the file's stream
			$itemDest = fopen($this->dao->toInternalPath($item['destPath']), 'w'); //Destination file

			if ($itemSource === false) {
				throw new RuntimeException('Cannot open zip file stream: "'.$item['sourcePath'].'" from "'.$zipPath.'"');
			}
			if ($itemDest === false) {
				throw new RuntimeException('Cannot open file for writing: "'.$item['destPath'].'"');
			}

			$copiedBytes = stream_copy_to_stream($itemSource, $itemDest); //Extract current file...
			
			//Close files
			fclose($itemDest);
			fclose($itemSource);

			//Post-check

			if (!empty($item['md5sum'])) { //If a md5 checksum is specified
				$destMd5 = md5_file($this->dao->toInternalPath($item['destPath'])); //Calculate the MD5 sum of the extracted file

				if ($item['md5sum'] != $destMd5) { //If checksums are different
					$this->dao->delete($item['destPath']); //Delete copied file
					throw new RuntimeException('Bad file checksum: "'.$item['destPath'].'". This file is corrupted. Please try to install this package again.');
				}
			}

			chmod($this->dao->toInternalPath($item['destPath']), 0777); //Allow read-write-execute for all users - better for maintaining the webos
		}

		//If it is an upgrade, remove newly deleted files
		if ($isUpgrade) {
			$localPkgFiles = $localRepo->listFilesByPackage($package->name());
			foreach($localPkgFiles as $fileData) {
				$oldInternalFilePath = preg_replace('#^/#', '', $fileData['path']);
				$oldFilePath = '/' . $oldInternalFilePath;

				//Was this file already processed ?
				if (!isset($filesToCopy[$oldInternalFilePath])) {
					//Delete old file
					$this->dao->delete($oldFilePath); //Delete this file

					//Delete parent folders while they are empty
					do {
						$parentDirPath = $this->dao->dirname((isset($parentDirPath)) ? $parentDirPath : $oldFilePath);

						$files = $this->dao->readDir($parentDirPath);
						$isEmpty = (count($files) == 0);

						if ($isEmpty) {
							$this->dao->delete($parentDirPath);
						}
					} while($isEmpty);
				}
			}
		}

		$zip->close(); //Close the package's source
	}

	protected function _register(ConfiturePackageMetadata $package, $pkgFiles, LocalRepositoryManager $localRepo) {
		$localRepo->insert($package);

		$files = array();
		foreach($pkgFiles as $filePath => $fileData) {
			$fileItem = array(
				'path' => $filePath,
				'pkg' => $package['name']
			);

			if (isset($fileData['md5sum'])) {
				$fileItem['md5sum'] = $fileData['md5sum'];
			}

			$files[] = $fileItem;
		}

		$localRepo->insertFiles($files);
	}

	protected function _runPostInstallScript(ConfiturePackageMetadata $package, $zipPath) {
		//Scripts' names
		$installScriptName = 'INSTALL.php';
		$removeScriptName = 'REMOVE.php';

		$zip = new \ZipArchive();
		$result = $zip->open($this->dao->toInternalPath($zipPath)); //Open the package's ZIP file

		if ($result !== true) { //Something went wrong
			throw new RuntimeException('Cannot open package\'s contents from temporary file "'.$zipPath.'" : ZipArchive error #'.$result);
		}

		//Scripts enabled ?
		if ($package['hasScripts'] !== true) {
			return;
		}

		//Install script
		$installScript = $zip->getFromName($installScriptName); //Here is the PHP code

		if ($installScript !== false) { //The file exists, evaluate the PHP code
			$installScript = preg_replace('#^\<\?(php)?#i', '', $installScript);
			$installScript = preg_replace('#\?\>$#i', '', $installScript);

			$installFn = create_function('', $installScript);

			try {
				call_user_func_array($installFn, array());
			} catch (\Exception $e) {}
		}

		//Remove script
		$removeScript = $zip->getFromName($removeScriptName);

		if ($removeScript !== false) { //The file exists, save the PHP code in a file
			$removeScriptsDirPath = self::REMOVE_SCRIPTS_DIR;
			$removeScriptPath = $removeScriptsDirPath . '/' . $package['name'] . '.php.txt';

			$canWriteScript = true;
			if (!$this->dao->isDir($removeScriptsDirPath)) {
				try {
					$this->dao->mkdir($removeScriptsDirPath, true);
				} catch (\Exception $e) { //Cannot create dir, let it be...
					$canWriteScript = false;
				}
			}
			
			if ($canWriteScript) {
				$this->dao->createFile($removeScriptPath);
				$this->dao->write($removeScriptPath, $removeScript);
			}
		}

		$zip->close(); //Close the package's ZIP file
	}

	public function _getPkgZipPath($tmpDirPath, ConfiturePackageMetadata $pkg) {
		return $tmpDirPath.'/'.$pkg['name'].'.zip';
	}

	public function install($packages, LocalRepositoryManager $localRepository, &$output = '') {
		$output = '';
		$pkgList = array(); //Array in which valid packages will be stored

		//Arguments processing
		if (is_array($packages)) {
			foreach($packages as $key => $pkg) {
				if ($pkg instanceof ConfiturePackageMetadata) {
					$pkgList[] = $pkg;
				} else {
					throw new \InvalidArgumentException('Invalid argument, packages must be an instance of "ConfiturePackageMetadata" or an array of "ConfiturePackageMetadata"');
				}
			}

			if (count($packages) == 0) {
				return;
			}
		} else if ($packages instanceof ConfiturePackageMetadata) {
			$pkgList[] = $packages;
		} else {
			throw new \InvalidArgumentException('Invalid argument, packages must be an instance of "ConfiturePackageMetadata" or an array of "ConfiturePackageMetadata"');
		}

		//First, resolve the dependency tree
		$output .= 'Resolving dependencies...'."\n";
		$tree = array();

		foreach ($pkgList as $pkg) { //For each package to install
			$pkgTree = $this->_calculateTree($pkg, $localRepository);

			$tree = $this->_mergeTrees($tree, $pkgTree);
		}

		$remoteRepositories = $this->listRepositories(); //Remote repositories
		$packagesToInstall = array(); //Packages to install

		//Check if we can install all packages
		foreach($tree as $node) {
			if ($node['level'] == 0) { //If node's level is 0 => it's a package asked by the user
				$found = false;
				foreach($pkgList as $pkg) {
					if ($pkg['name'] == $node['name']) {
						$packagesToInstall[] = $pkg;
						$found = true;
						break;
					}
				}
				if ($found) {
					continue;
				}
			}

			//First check if the requiered package is already installed
			$localPkg = $this->_resolveDependency($node, $localRepository);

			if ($localPkg === null) { //No => we must download it from remote repositories
				$found = false;
				foreach($remoteRepositories as $repo) {
					$remotePkg = $this->_resolveDependency($node, $repo);

					if ($remotePkg !== null) { //Package found
						$packagesToInstall[] = $remotePkg;
						$found = true;
						break;
					}
				}

				if (!$found) { //Package not found, trigger an error
					$pkgsRequiringThisDep = implode('", "', $node['parents']);
					$minVersion = (isset($node['minVersion'])) ? (($node['minVersionStrict']) ? '>' : '>=').$node['minVersion'] : '';
					$maxVersion = (isset($node['maxVersion'])) ? (($node['maxVersionStrict']) ? '<' : '<=').$node['maxVersion'] : '';

					throw new \RuntimeException('Cannot resolve the dependency tree: packages "'.$pkgsRequiringThisDep.'" require "'.$node['name'].$maxVersion.$minVersion.'"');
				}
			}
		}

		//Second, download the packages' sources
		//Create a temporary folder
		$tmpDirPath = $this->dao->tmpfile();
		$this->dao->mkdir($tmpDirPath);
		$packagesNbr = count($packagesToInstall);
		$pkgsFiles = array(); //Packages files

		foreach($packagesToInstall as $i => $pkg) { //Download each package
			$output .= '('.($i + 1).'/'.$packagesNbr.') downloading '.$pkg['name'].' files'."\n";

			$pkgsFiles[$pkg['name']] = $this->_getPkgFiles($pkg);

			$zipPath = $this->_getPkgZipPath($tmpDirPath, $pkg);
			$this->_download($pkg, $zipPath);
		}

		//Then, check and extract zipped files
		foreach($packagesToInstall as $pkg) {
			$output .= '('.($i + 1).'/'.$packagesNbr.') installing '.$pkg['name']."\n";

			$zipPath = $this->_getPkgZipPath($tmpDirPath, $pkg);
			$this->_extract($pkg, $zipPath, $pkgsFiles[$pkg['name']], $localRepository);
		}

		//And run post-installation scripts
		foreach($packagesToInstall as $pkg) {
			$output .= '('.($i + 1).'/'.$packagesNbr.') configuring '.$pkg['name']."\n";

			$zipPath = $this->_getPkgZipPath($tmpDirPath, $pkg);
			$this->_runPostInstallScript($pkg, $zipPath);
		}

		//Finally, register new packages in the local DB
		foreach($packagesToInstall as $pkg) {
			//Check if the package is already installed
			//If this is an upgrade, remove the old data before inserting the new one
			if (($localPkg = $localRepository->getByName($pkg->name())) !== null) {
				$localRepository->delete($localPkg['name']);
			}

			$this->_register($pkg, $pkgsFiles[$pkg['name']], $localRepository);
		}
	}

	public function calculateUpgrades(LocalRepositoryManager $localRepository) {
		$installedPkgs = $localRepository->listAll();

		$upgrades = array();

		foreach ($installedPkgs as $installedPkg) {
			$remotePkg = $this->getByName($installedPkg['name']);

			if ($remotePkg !== null && version_compare($remotePkg['version'], $installedPkg['version'], '>')) {
				$upgrades[] = $remotePkg;
			}
		}

		return $upgrades;
	}

	public function _runPreRemoveScript(ConfiturePackageMetadata $pkg) {
		$removeScriptsDirPath = self::REMOVE_SCRIPTS_DIR;
		$removeScriptPath = $removeScriptsDirPath . '/' . $pkg['name'] . '.php.txt';

		if ($this->dao->exists($removeScriptPath)) {
			$removeScript = $this->dao->read($removeScriptPath);

			$removeScript = preg_replace('#^\<\?(php)?#i', '', $removeScript);
			$removeScript = preg_replace('#\?\>$#i', '', $removeScript);

			$removeFn = create_function('', $removeScript);

			try {
				call_user_func_array($removeFn, array());
			} catch (\Exception $e) {}

			$this->dao->delete($removeScriptPath);
		}
	}

	protected function _deleteFiles(ConfiturePackageMetadata $pkg, $pkgFiles) {
		foreach($pkgFiles as $fileData) {
			$filePath = '/' . $fileData['path'];

			if ($this->dao->exists($filePath)) {
				//Pre-check
				if (isset($fileData['md5sum']) && !empty($fileData['md5sum'])) { //If a md5 checksum is specified
					$fileMd5 = md5_file($this->dao->toInternalPath($filePath)); //Calculate the MD5 sum of the existing file

					if ($fileData['md5sum'] != $fileMd5) { //If checksums are different
						continue; //Do not delete the file
					}
				}

				$this->dao->delete($filePath);

				//Delete parent folders while they are empty
				do {
					$parentDirPath = $this->dao->dirname((isset($parentDirPath)) ? $parentDirPath : $filePath);
					
					$childs = $this->dao->readDir($parentDirPath);
					$isEmpty = (count($childs) == 0);

					if ($isEmpty) {
						$this->dao->delete($parentDirPath);
					}
				} while($isEmpty);
			}
		}
	}

	public function _unregister(ConfiturePackageMetadata $pkg, LocalRepositoryManager $localRepo) {
		$localRepo->delete($pkg['name']);
	}

	public function remove($packages, LocalRepositoryManager $localRepo, &$output = '') {
		$pkgList = array(); //Array in which valid packages will be stored
		$output = '';

		//Arguments processing
		if (is_array($packages)) {
			foreach($packages as $key => $pkg) {
				if ($pkg instanceof ConfiturePackageMetadata) {
					$pkgList[] = $pkg;
				} else {
					throw new \InvalidArgumentException('Invalid argument, packages must be an instance of "ConfiturePackageMetadata" or an array of "ConfiturePackageMetadata"');
				}
			}

			if (count($packages) == 0) {
				return;
			}
		} else if ($packages instanceof ConfiturePackageMetadata) {
			$pkgList[] = $packages;
		} else {
			throw new \InvalidArgumentException('Invalid argument, packages must be an instance of "ConfiturePackageMetadata" or an array of "ConfiturePackageMetadata"');
		}

		//TODO: check dependencies

		$packagesNbr = count($pkgList);

		foreach($pkgList as $i => $pkg) { //Uninstall packages
			$output .= '('.($i + 1).'/'.$packagesNbr.') removing '.$pkg['name']."\n";

			$pkgFiles = $localRepo->listFilesByPackage($pkg['name']);

			$this->_runPreRemoveScript($pkg);
			$this->_deleteFiles($pkg, $pkgFiles); //Delete this package's files
			$this->_unregister($pkg, $localRepo); //Unregister this package from the local DB
		}
	}
}