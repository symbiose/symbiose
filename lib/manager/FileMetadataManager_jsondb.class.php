<?php
namespace lib\manager;

use RuntimeException;

class FileMetadataManager_jsondb extends EntityManager_jsondb implements FileMetadataManager {
	protected $entityName = '\lib\entities\FileMetadata';
	protected $dbName = 'core/files_metadata';

	protected function cleanPath($filepath) {
		if ($filepath !== '/') {
			$filepath = rtrim($filepath, '/'); //Remove trailing slash
		}

		return $filepath;
	}

	public function pathExists($filepath) {
		$filepath = $this->cleanPath($filepath);

		return $this->exists('path', $filepath);
	}

	public function getByPath($filepath) {
		$filepath = $this->cleanPath($filepath);

		return $this->getBy('path', $filepath);
	}

	public function listParents($filepath, $withPath = false) {
		$filepath = $this->cleanPath($filepath);

		$parentPaths = array();
		if ($withPath) {
			$parentPaths[] = $filepath;
		}

		while (($lastPos = strrpos($filepath, '/')) !== false) {
			$filepath = substr($filepath, 0, $lastPos);

			if (!empty($filepath)) {
				$parentPaths[] = $filepath;
			}
		}

		$parents = $this->listBy(array(
			'path' => $parentPaths
		));

		usort($parents, function ($a, $b) {
			return (strlen($b['path']) - strlen($a['path'])); // Sort using descending order
		});

		return $parents;
	}

	public function getFirstParent($filepath, $withPath = false) {
		$filepath = $this->cleanPath($filepath);

		$parents = $this->listParents($filepath, $withPath);
		if (empty($parents)) {
			return null;
		}

		return $parents[0];
	}

	public function getClosest($filepath) {
		return $this->getFirstParent($filepath, true);
	}

	/*public function listByUser($userId) {
		
	}

	protected function _getByPath($sharesData, $filepath) {
		$filepath = rtrim($filepath, '/'); //Remove trailing slash

		foreach($sharesData as $shareData) {
			$sharePath = rtrim($shareData['path'], '/'); //Remove trailing slash
			
			//If the path matches
			if ($filepath == $sharePath || substr($filepath, 0, strlen($sharePath) + 1) == $sharePath.'/') {
				return new SharedFile($shareData);
			}
		}

		return null;
	}

	public function getByPath($userId, $filepath) {
		$sharesFile = $this->dao->open(self::SHARES_DB);
		$sharesData = $sharesFile->read()->filter(array('userId' => $userId));

		return $this->_getByPath($sharesData, $filepath);
	}

	public function getByKey($shareKey, $filepath) {
		$sharesFile = $this->dao->open(self::SHARES_DB);
		$sharesData = $sharesFile->read()->filter(array('key' => $shareKey));

		return $this->_getByPath($sharesData, $filepath);
	}*/
}