<?php
namespace lib\acl;

use FSi\Component\ACL\ACEAbstract;

class FileACE extends ACEAbstract {
	public function isAllowed(array $params = array()) {
		$role = $this->getRole();
		$resource = $this->getResource();
		$permissions = $this->getPermissions();

		return false;
	}
}