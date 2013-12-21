<?php
namespace lib\manager;

use \lib\entities\ConfiturePackageMetadata;
use \lib\entities\ConfitureRepository;
use \RuntimeException;

class ConfitureRepositoryManager_localfs extends ConfitureRepositoryManager {
	const CONFIG_DIR = '/etc/confiture';
	const CACHE_DIR = '/var/cache/confiture';

	protected function _buildPackageMetadata($pkgData) {
		$pkgData['updateDate'] = strtotime($pkgData['updateDate']);

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

		if (!isset($reposList[$repoName])) {
			return null;
		}

		return $reposList[$repoName];
	}

	public function repositoryExists($repoName) {
		$repos = $this->listRepositories();

		return isset($reposList[$repoName]);
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
		$pkgsFile = $this->dao->open(self::PKGS_DB);

		$pkgsData = $pkgsFile->read();
		return count($pkgsData);
	}

	public function getByName($pkgName) {
		$pkgsFile = $this->dao->open(self::PKGS_DB);
		$pkgsData = $pkgsFile->read()->filter(array('name' => $pkgName));

		if (count($pkgsData) == 0) {
			return null;
		}

		return $this->_buildPackageMetadata($pkgsData[0]);
	}

	public function listByRepository($repoName) {
		$this->_autoUpdateCache($repoName);

		$indexFile = $this->_indexCache($repoName);
		$indexes = $indexFile->read();
		$list = array();

		foreach($indexes as $index) {
			$list[] = $this->_buildPackageMetadata($index);
		}

		return $list;
	}

	public function getByRepository($repoName, $pkgName) {
		$this->_autoUpdateCache($repoName);

		$indexFile = $this->_indexCache($repoName);
		$indexes = $indexFile->read();

		foreach($indexes as $index) {
			if ($index['name'] == $pkgName) {
				return $this->_buildPackageMetadata($index);
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

	// SETTERS

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
}