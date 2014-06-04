<?php
namespace lib\manager;

use lib\Manager;
use lib\Entity;

abstract class EntityManager extends Manager {
	protected $entityName;

	protected function _buildEntity(array $data) {
		$className = $this->entityName;

		return new $className($data);
	}

	protected function _buildEntitiesList($dataList) {
		$list = array();

		foreach($dataList as $entityData) {
			$list[] = $this->_buildEntity($entityData);
		}

		return $list;
	}

	// GETTERS //

	abstract public function listBy($fields, array $opts = array());
	abstract public function listAll();
	abstract public function getBy($fieldName, $fieldValue);
	abstract public function getById($entityId);
	abstract public function exists($fieldName, $fieldValue);
	abstract public function idExists($entityId);

	// SETTERS //

	abstract public function insert(Entity &$entity);
	abstract public function update(Entity $entity);
	abstract public function delete($entityId);
}