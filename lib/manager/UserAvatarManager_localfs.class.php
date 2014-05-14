<?php
namespace lib\manager;

use InvalidArgumentException;

/**
 * Manage users' avatars.
 */
abstract class UserAvatarManager_localfs extends UserAvatarManager {
	const AVATARS_DIR = '/var/lib/users-avatars';

	protected function getAvatarPath($userId) {
		if (!is_int($userId)) {
			throw new InvalidArgumentException('Invalid user id "'.$userId.'"');
		}

		return self::AVATARS_DIR.'/'.(int) $userId.'.png';
	}

	public function exists($userId) {
		return $this->dao->exists($this->getAvatarPath($userId));
	}

	public function getById($userId) {
		if (!$this->exists($userId)) {
			return null;
		}

		return 'data:image/png;base64,'.base64_encode($this->dao->read($this->getAvatarPath($userId)));
	}

	public function setById($userId, $imgData) {
		$dataUriStart = 'data:image/png;base64,';

		if (substr($imgData, 0, strlen($dataUriStart)) !== $dataUriStart) {
			throw new InvalidArgumentException('Invalid user profile picture "'.$imgData.'"');
		}

		$base64Data = substr($imgData, strlen($dataUriStart) + 1);
		$binaryData = base64_decode($base64Data);

		if (!$this->dao->isDir(self::AVATARS_DIR)) {
			$this->dao->mkdir(self::AVATARS_DIR, true);
		}

		$this->dao->write($this->getAvatarPath($userId), $binaryData);
	}

	public function unsetById($userId) {
		if (!$this->exists($userId)) {
			return;
		}

		$this->dao->delete($this->getAvatarPath($userId));
	}
}