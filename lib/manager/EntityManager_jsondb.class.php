<?php
namespace lib\manager;

use lib\Entity;

class EntityManager_jsondb extends EntityManager {
	protected $dbName;

	// GETTERS //

	public function listBy($fields, array $opts = array()) {
		$dbFile = $this->dao->open($this->dbName);

		$dataList = $dbFile->read();

		if (!empty($fields)) {
			$dataList = $dataList->filter($fields);
		}
		if (isset($opts['orderBy'])) {
			$orderBy = $opts['orderBy'];
			$orderDesc = (isset($opts['orderDir']) && strtoupper($opts['orderDir']) == 'DESC') ? true : false;

			$dataList = $dataList->orderBy($orderBy, $orderDesc);
		}
		if (isset($opts['limit']) || isset($opts['offset'])) {
			$offset = (isset($opts['offset'])) ? (int) $opts['offset'] : 0;
			$length = (isset($opts['limit'])) ? (int) $opts['limit'] : null;

			$dataList = $dataList->limit($offset, $length);
		}

		return $this->_buildEntitiesList($dataList);
	}

	public function listAll() {
		return $this->listBy(array());
	}

	public function getBy($fieldName, $fieldValue = null) {
		if (!is_array($fieldName)) {
			$filter = array($fieldName => $fieldValue);
		} else {
			$filter = $fieldName;
		}

		$results = $this->listBy($filter, array(
			'limit' => 1
		));

		if (empty($results)) {
			return null;
		}

		return $results[0];
	}

	public function getById($entityId) {
		return $this->getBy('id', $entityId);
	}

	public function exists($fieldName, $fieldValue) {
		return (!empty($this->getBy($fieldName, $fieldValue)));
	}

	public function idExists($entityId) {
		return $this->exists('id', $entityId);
	}

	// SETTERS //

	public function insert(Entity &$entity) {
		$dbFile = $this->dao->open($this->dbName);
		$items = $dbFile->read();

		if (count($items) > 0) {
			$last = $items->last();
			$insertId = $last['id'] + 1;
		} else {
			$insertId = 0;
		}
		$entity->setId($insertId);

		$item = $this->dao->createItem($entity->toArray());
		$items[] = $item;

		$dbFile->write($items);
	}

	public function update(Entity $entity) {
		$dbFile = $this->dao->open($this->dbName);
		$items = $dbFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $entity['id']) {
				$items[$i] = $this->dao->createItem($entity->toArray());
				$dbFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find an entity with id "'.$entity['id'].'"');
	}

	public function delete($entityId) {
		$dbFile = $this->dao->open($this->dbName);
		$items = $dbFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $entityId) {
				unset($items[$i]);
				$dbFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find an entity with id "'.$entityId.'"');
	}
}