<?php
namespace lib\ctrl\api;

use Exception;
use InvalidArgumentException;
use RuntimeException;

use Gitonomy\Git\Repository;
use Gitonomy\Git\Commit;
use Gitonomy\Git\Tree;

/**
 * Manage Git repositories.
 * @author emersion
 * @since 1.0beta5
 */
class GitController extends FileController {
	const CONFIG_FILE = '/etc/gitfs.json';

	protected function getConfig() {
		$configManager = $this->managers()->getManagerOf('config');

		return $configManager->open(self::CONFIG_FILE);
	}

	protected function commitToArray(Commit $commit) {
		$commitData = array(
			'hash' => $commit->getHash(),
			'shortHash' => $commit->getShortHash(),
			'parentHashes' => $commit->getParentHashes(),
			'shortMessage' => $commit->getShortMessage(),
			'authorName' => $commit->getAuthorName(),
			'authorEmail' => $commit->getAuthorEmail(),
			'authorDate' => $commit->getAuthorDate(),
			'message' => $commit->getMessage()
		);

		return $commitData;
	}

	protected function isGitEnabled() {
		$config = $this->getConfig()->read();

		return (isset($config['enabled']) && $config['enabled'] === true);
	}

	protected function getRepo($dir, $create = false) {
		$manager = $this->managers()->getManagerOf('file');
		$internalPath = $manager->toInternalPath($dir);
		$config = $this->getConfig()->read();

		if (!isset($config['enabled']) || $config['enabled'] != true) {
			throw new RuntimeException('Cannot open git repository "'.$dir.'" (git filesystems are disabled in "'.self::CONFIG_FILE.'")', 403);
		}

		$opts = array();
		if (!empty($config['gitCommand'])) {
			$opts['command'] = $config['gitCommand'];
		}
		if (is_array($config['environmentVariables'])) {
			$opts['environment_variables'] = $config['environmentVariables'];
		}
		if (is_int($config['processTimeout'])) {
			$opts['process_timeout'] = (int) $config['processTimeout'];
		}

		if ($manager->isDir($dir.'/.git')) {
			$repo = new Repository($internalPath, $opts);
		} else {
			if ($create) {
				$repo = \Gitonomy\Git\Admin::init($internalPath, false, $opts);

				$manager->write($dir.'/.gitignore', '/.*'); // Ignore hidden files

				$this->addFilesToRepo($repo, '*');
				$this->commitRepo($repo, 'Initial commit');
			} else {
				throw new InvalidArgumentException('"'.$dir.'": not a git repository', 404);
			}
		}

		return $repo;
	}

	protected function getRepoFromFile($path) {
		$manager = $this->managers()->getManagerOf('file');

		if (!$manager->isDir($path)) {
			$path = $manager->dirname($path);
		}

		while ($manager->isDir($path) && $path !== '/') {
			if ($manager->isDir($path.'/.git')) {
				return $this->getRepo($path);
			}

			$path = $manager->dirname($path);
		}

		return null;
	}

	protected function repoRelativePaths($repo, $paths) {
		$manager = $this->managers()->getManagerOf('file');

		if (!is_array($paths)) {
			$paths = array($paths);
		}

		$workingDir = $manager->toExternalPath($repo->getWorkingDir()).'/';

		$relativePaths = array();
		foreach ($paths as $path) {
			if (strpos($path, $workingDir) === 0) {
				$relativePath = substr($path, strlen($workingDir));
				$relativePaths[] = $relativePath;
			} else {
				$relativePaths[] = $path;
			}
		}

		return $relativePaths;
	}

	protected function addFilesToRepo($repo, $paths) {
		$addedPaths = $this->repoRelativePaths($repo, $paths);

		$repo->run('add', $addedPaths);
	}

	protected function commitRepo($repo, $msg) {
		$userManager = $this->managers()->getManagerOf('user');
		$user = $this->app()->user();
		$userData = $userManager->getById($user->id());

		$repo->run('commit', array('--author="'.$userData['username'].' <'.$userData['email'].'>"', '-m', $msg));
	}

	protected function getEntity($path, $revision) {
		$repo = $this->getRepoFromFile($path);
		$commit = $repo->getCommit($revision);
		$tree = $commit->getTree();

		$relativePaths = $this->repoRelativePaths($repo, array($path));

		try {
			return $tree->resolvePath($relativePaths[0]);
		} catch (InvalidArgumentException $e) {
			throw new RuntimeException('"'.$path.'": no such file or directory in revision "'+$revision+'"', 404);
		}
	}

	protected function getEntityData($entity) {
		$manager = $this->managers()->getManagerOf('file');

		$data = array();

		if ($entity instanceof Tree) {
			$data['is_dir'] = true;
			$data['size'] = count($entity->getEntries());
		} else {
			$data['is_dir'] = false;
			$data['mime_type'] = $entity->getMimetype();
			$data['size'] = strlen($entity->getContent());
		}

		return $data;
	}

	// GETTERS

	// Regular commands

	public function executeGetContents($path, $revision = null) {
		if (empty($revision)) {
			return parent::executeGetContents($path);
		} else {
			$entity = $this->getEntity($path, $revision);

			if ($entity instanceof Tree) { // Tree
				$children = $entity->getEntries();

				$list = array();
				foreach ($children as $name => $child) {
					$childPath = $path.'/'.$name;
					$list[$name] = array_merge($this->getPathData($childPath), $this->getEntityData($child));
				}

				return $list;
			} else { // Blob
				return $entity->getContent();
			}
		}
	}

	public function executeGetAsBinary($path, $revision = null) {
		$manager = $this->managers()->getManagerOf('file');

		if (empty($revision)) {
			return parent::executeGetAsBinary($path);
		} else {
			$entity = $this->getEntity($path, $revision);

			if ($entity instanceof Tree) {
				throw new \RuntimeException('"'.$path.'": is a directory (tried to open it as a binary file), at revision "'.$revision.'"', 405);
			}

			return base64_encode($entity->getContent());
		}
	}

	public function executeGetMetadata($path, $revision = null) {
		$manager = $this->managers()->getManagerOf('file');

		if (empty($revision)) {
			$data = parent::executeGetMetadata($path);

			$data['labels']['versionned'] = $this->isGitEnabled();
		} else {
			$entity = $this->getEntity($path, $revision);

			$data = array_merge($this->getPathData($path), $this->getEntityData($entity), array(
				'version' => $revision
			));
		}

		return $data;
	}

	// Git commands

	public function executeGetLog($dir, array $opts = array()) {
		$manager = $this->managers()->getManagerOf('file');

		$opts = array_merge(array(
			'paths' => null,
			'offset' => null,
			'limit' => null
		), $opts);

		$repo = $this->getRepo($dir);

		$log = $repo->getLog('master', $this->repoRelativePaths($repo, $opts['paths']), $opts['offset'], $opts['limit']);

		$list = array();
		foreach ($log->getCommits() as $commit) {
			$list[] = $this->commitToArray($commit);
		}

		return $list;
	}

	// SETTERS

	// Regular commands

	public function executeRename($path, $newName) {
		$fileData = parent::executeRename($path, $newName);

		try {
			$repo = $this->getRepoFromFile($path);
		} catch (Exception $e) {
			return $fileData;
		}

		$this->addFilesToRepo($repo, array($path, $fileData['path']));
		$this->commitRepo($repo, 'Moved '.$path.' to '.$newName);

		return $fileData;
	}

	public function executeCopy($source, $dest) {
		$destData = parent::executeCopy($source, $dest);

		try {
			$repo = $this->getRepoFromFile($destData['path']);
		} catch (Exception $e) {
			return $destData;
		}
		
		$this->addFilesToRepo($repo, $destData['path']);
		$this->commitRepo($repo, 'Copied '.$source.' to '.$dest);

		return $destData;
	}

	public function executeMove($source, $dest) {
		$destData = parent::executeMove($source, $dest);

		try {
			$repo = $this->getRepoFromFile($destData['path']);
		} catch (Exception $e) {
			return $destData;
		}

		$this->addFilesToRepo($repo, array($source, $destData['path']));
		$this->commitRepo($repo, 'Moved '.$source.' to '.$dest);

		return $destData;
	}

	public function executeDelete($path) {
		parent::executeDelete($path);

		try {
			$repo = $this->getRepoFromFile($path);
		} catch (Exception $e) {
			return;
		}

		$this->addFilesToRepo($repo, $path);
		$this->commitRepo($repo, 'Deleted '.$path);
	}

	public function executeCreateFile($path) {
		$newFileData = parent::executeCreateFile($path);

		try {
			$repo = $this->getRepoFromFile($path);
		} catch (Exception $e) {
			return $newFileData;
		}

		$this->addFilesToRepo($repo, $path);
		$this->commitRepo($repo, 'Created '.$path);

		return $newFileData;
	}

	public function executeSetContents($path, $contents) {
		$fileData = parent::executeSetContents($path, $contents);

		try {
			$repo = $this->getRepoFromFile($path);
		} catch (Exception $e) {
			return $fileData;
		}

		$this->addFilesToRepo($repo, $path);
		$this->commitRepo($repo, 'Updated '.$path);

		return $fileData;
	}

	public function executeUpload($dest) {
		$uploadData = parent::executeUpload($dest);
		$newFileData = $uploadData['file'];

		try {
			$repo = $this->getRepoFromFile($path);
		} catch (Exception $e) {
			return $uploadData;
		}

		$this->addFilesToRepo($repo, $newFileData['path']);
		$this->commitRepo($repo, 'Uploaded '.$newFileData['path']);

		return $uploadData;
	}

	// Git commands

	public function executeInitRepo($dir) {
		$repo = $this->getRepo($dir, true);
	}

	public function executeRemoveRepo($dir) {
		$manager = $this->managers()->getManagerOf('file');

		$repo = $this->getRepo($dir);

		$gitDir = $repo->getGitDir();
		$manager->delete($manager->toExternalPath($gitDir), true);
	}

	public function executeRestore($path, $revision) {
		$oldContents = $this->executeGetContents($path, $revision);

		return $this->executeSetContents($path, $oldContents);
	}
}