<?php
namespace lib\manager;

use \lib\Manager;

abstract class ProcessAuthorizationManager extends Manager {
	/**
	 * Get a process' authorizations.
	 * @param  int $pid The process id.
	 * @return array    The process' authorizations.
	 */
	abstract public function getByPid($pid);

	/**
	 * Set a process' authorizations.
	 * @param int   $pid   The process id.
	 * @param array $auths The process' authorizations.
	 */
	abstract public function setByPid($pid, array $auths);

	/**
	 * Unset a process' authorizations.
	 * @param int   $pid   The process id.
	 */
	abstract public function unsetByPid($pid);
}