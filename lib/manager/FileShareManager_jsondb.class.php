<?php
namespace lib\manager;

use RuntimeException;

class FileShareManager_jsondb extends EntityManager_jsondb {
	protected $entityName = '\lib\entities\FileShare';
	protected $dbName = 'core/files_shares';

	public function fileIdExists($fileId) {
		return $this->exists('fileId', $fileId);
	}

	public function listByFileId($fileId) {
		return $this->listBy(array(
			'fileId' => $fileId
		));
	}

	public function listByFileIdAndType($fileId, $type) {
		return $this->listBy(array(
			'fileId' => $fileId,
			'type' => $type
		));
	}

	public function getByFileIdAndKey($fileId, $key) {
		return $this->getBy(array(
			'fileId' => $fileId,
			'key' => $key
		));
	}
}