<?php
namespace lib\ctrl\api;

use InvalidArgumentException;
use RuntimeException;

use Gitonomy\Git\Repository;
use Gitonomy\Git\Commit;

/**
 * Manage Git repositories.
 * @author emersion
 * @since 1.0beta5
 */
class GitController extends FileController {
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

	protected function getRepo($dir, $create = false) {
		$manager = $this->managers()->getManagerOf('file');
		$internalPath = $manager->toInternalPath($dir);

		if ($manager->isDir($dir.'/.git')) {
			$repo = new Repository($internalPath);
		} else {
			if ($create) {
				$repo = \Gitonomy\Git\Admin::init($internalPath, false);

				$manager->write($dir.'/.gitignore', '/.*'); // Ignore hidden files

				$this->addFilesToRepo($repo, '*');
				$this->commitRepo($repo, 'Initial commit');
			} else {
				throw new RuntimeException('"'.$dir.'": not a git repository', 404);
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

	// GETTERS

	// Regular commands

	public function executeGetData($path) {
		$manager = $this->managers()->getManagerOf('file');

		$data = parent::executeGetData($path);

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

		$repo = $this->getRepoFromFile($path);

		$this->addFilesToRepo($repo, array($path, $fileData['path']));
		$this->commitRepo($repo, 'Moved '.$path.' to '.$newName);

		return $fileData;
	}

	public function executeCopy($source, $dest) {
		$destData = parent::executeCopy($source, $dest);

		$repo = $this->getRepoFromFile($path);
		
		$this->addFilesToRepo($repo, $destData['path']);
		$this->commitRepo($repo, 'Copied '.$source.' to '.$dest);

		return $destData;
	}

	public function executeMove($source, $dest) {
		$destData = parent::executeMove($source, $dest);

		$repo = $this->getRepoFromFile($path);
		
		$this->addFilesToRepo($repo, $destData['path']);
		$this->commitRepo($repo, 'Moved '.$source.' to '.$dest);

		return $destData;
	}

	public function executeDelete($path) {
		parent::executeDelete($path);

		$repo = $this->getRepoFromFile($path);

		$this->addFilesToRepo($repo, $path);
		$this->commitRepo($repo, 'Deleted '.$path);
	}

	public function executeCreateFile($path) {
		$newFileData = parent::executeCreateFile($path);

		$repo = $this->getRepoFromFile($path);

		$this->addFilesToRepo($repo, $path);
		$this->commitRepo($repo, 'Created '.$path);

		return $newFileData;
	}

	public function executeSetContents($path, $contents) {
		$fileData = parent::executeSetContents($path, $contents);

		$repo = $this->getRepoFromFile($path);

		$this->addFilesToRepo($repo, $path);
		$this->commitRepo($repo, 'Updated '.$path);

		return $fileData;
	}

	public function executeUpload($dest) {
		$uploadData = parent::executeUpload($dest);
		$newFileData = $uploadData['file'];

		$repo = $this->getRepoFromFile($path);

		$this->addFilesToRepo($repo, $newFileData['path']);
		$this->commitRepo($repo, 'Uploaded '.$newFileData['path']);

		return $uploadData;
	}

	// Git commands

	public function executeInitRepo($dir) {
		$manager = $this->managers()->getManagerOf('file');

		$repo = $this->getRepo($dir, true);
	}

	public function executeRemoveRepo($dir) {
		$manager = $this->managers()->getManagerOf('file');

		$repo = $this->getRepo($dir);

		$gitDir = $repo->getGitDir();
		$manager->delete($manager->toExternalPath($gitDir), true);
	}
}