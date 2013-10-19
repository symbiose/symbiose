<?php
namespace lib\manager;

use \RuntimeException;
use \lib\entities\SharedFile;

class SharedFileManager_jsondb extends SharedFileManager {
	const SHARES_DB = 'core/files_shared';

	public function listByUser($userId) {
		$sharesFile = $this->dao->open(self::SHARES_DB);

		$sharesData = $sharesFile->read()->filter(array('userId' => $userId));
		$list = array();

		foreach($sharesData as $shareData) {
			$list[] = new SharedFile($shareData);
		}

		return $list;
	}

	public function getById($shareId) {
		$sharesFile = $this->dao->open(self::SHARES_DB);
		$sharesData = $sharesFile->read()->filter(array('id' => $shareId));

		if (count($sharesData) == 0) {
			return null;
		}

		return new SharedFile($sharesData[0]);
	}

	public function getByPath($userId, $filepath) {
		$sharesFile = $this->dao->open(self::SHARES_DB);
		$sharesData = $sharesFile->read()->filter(array('userId' => $userId));

		$filepath = rtrim($filepath, '/'); //Remove trailing slash

		foreach($sharesData as $shareData) {
			$sharePath = rtrim($shareData['path'], '/'); //Remove trailing slash
			
			//If the path matches
			if ($filepath == $sharePath || substr($filepath, 0, strlen($sharePath) + 1) == $sharePath.'/') {
				return new SharedFile($shareData);
			}
		}
	}

	public function pathExists($userId, $filepath) {
		$sharedFile = $this->getByPath($userId, $filepath);

		return (!empty($sharedFile));
	}

	// SETTERS
	
	public function insert(SharedFile $sharedFile) {
		if ($this->pathExists($sharedFile['userId'], $sharedFile['path'])) { //Duplicate shared file ?
			throw new RuntimeException('The file "'.$sharedFile['path'].'" is already shared');
		}

		$sharesFile = $this->dao->open(self::SHARES_DB);
		$items = $sharesFile->read();

		if (count($items) > 0) {
			$last = $items->last();
			$shareId = $last['id'] + 1;
		} else {
			$shareId = 0;
		}
		$sharedFile->setId($shareId);

		$item = $this->dao->createItem($sharedFile->toArray());
		$items[] = $item;

		$sharesFile->write($items);
	}

	public function update(SharedFile $sharedFile) {
		$currentShare = $this->getById($sharedFile['id']);
		if (empty($currentShare)) { //Non-existing file share ?
			throw new RuntimeException('The file "'.$sharedFile['path'].'" is not shared');
		}
		if ($currentShare['path'] != $sharedFile['path'] && $this->pathExists($sharedFile['userId'], $sharedFile['path'])) { //Duplicate path ?
			throw new RuntimeException('The file "'.$sharedFile['path'].'" is already shared');
		}

		$sharesFile = $this->dao->open(self::SHARES_DB);
		$items = $sharesFile->read();

		$shareItem = $this->dao->createItem($sharedFile->toArray());

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $sharedFile['id']) {
				$items[$i] = $shareItem;
				$sharesFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a shared file with id "'.$sharedFile['id'].'" (path: "'.$sharedFile['path'].'")');
	}

	public function delete($shareId) {
		$sharesFile = $this->dao->open(self::SHARES_DB);
		$items = $sharesFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $shareId) {
				unset($items[$i]);
				$sharesFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a shared file with id "'.$shareId.'"');
	}
}