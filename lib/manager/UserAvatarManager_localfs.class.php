<?php
namespace lib\manager;

use InvalidArgumentException;
use RuntimeException;

/**
 * Manage users' avatars.
 */
class UserAvatarManager_localfs extends UserAvatarManager {
	const AVATARS_DIR = '/var/lib/users-avatars';
	//const MAX_SIZE_PX = 150;
	const MAX_SIZE_BYTES = 51200; // 50 * 1024

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

		$base64Data = substr($imgData, strlen($dataUriStart));
		$binaryData = base64_decode($base64Data);

		/*if (function_exists('getimagesizefromstring')) {
			$imgSize = getimagesizefromstring($binaryData);

			if ($imgSize[0] > self::MAX_SIZE_PX || $imgSize[1] > self::MAX_SIZE_PX) {
				throw new RuntimeException('Profile picture too large (provided: '.$imgSize[0].'x'.$imgSize[1].', max size: '.self::MAX_SIZE_PX.')');
			}
		}*/

		$imgSize = strlen($binaryData);
		if ($imgSize > self::MAX_SIZE_BYTES) {
			throw new RuntimeException('Profile picture too large (provided: '.$imgSize.' bytes, max size: '.self::MAX_SIZE_BYTES.' bytes)');
		}

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