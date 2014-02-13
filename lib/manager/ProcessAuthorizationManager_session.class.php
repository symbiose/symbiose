<?php
namespace lib\manager;

class ProcessAuthorizationManager_session extends ProcessAuthorizationManager {
	//GETTERS

	public function getByPid($pid) {
		$permissions = $this->dao->get('processes_permissions');

		if (!isset($permissions[$pid])) {
			return array();
		}

		return unserialize($permissions[$pid]);
	}

	//SETTERS

	public function setByPid($pid, array $auths) {
		$permissions = $this->dao->get('processes_permissions');

		if (!is_int($pid)) {
			throw new \InvalidArgumentException('Invalid process id "'.$pid.'"');
		}

		$permissions[$pid] = serialize($auths);
		$this->dao->set('processes_permissions', $permissions);
	}

	public function unsetByPid($pid) {
		$permissions = $this->dao->get('processes_permissions');

		if (!isset($permissions[$pid])) {
			throw new \RuntimeException('Cannot find process with id "'.$pid.'"');
		}

		unset($permissions[$pid]);
		$this->dao->set('processes_permissions', $permissions);
	}
}