<?php
namespace lib\manager;

use \lib\entities\Process;

if (!isset($_SESSION)) {
	session_start();
}
if (!isset($_SESSION['processes'])) {
	$_SESSION['processes'] = array();
}

/**
 * Manage processes.
 * @author $imon
 */
class ProcessManager extends \lib\Manager {
	/**
	 * Check if a process exists.
	 * @param int $pid The PID.
	 * @return bool True if the process exists.
	 */
	public function exists($pid) {
		return array_key_exists($pid, $_SESSION['processes']);
	}

	/**
	 * Get a process.
	 * @param int $pid The PID.
	 * @return Process The process.
	 */
	public function get($pid) {
		if (!$this->exists($pid))
			return null;
		else {
			return unserialize($_SESSION['processes'][$pid]);
		}
	}

	/**
	 * List all processes.
	 * @return array A list containing all running processes.
	 */
	public function listAll() {
		$list = array();
		foreach($_SESSION['processes'] as $pid => $process) {
			$list[] = $this->get($pid);
		}
		return $list;
	}

	/**
	 * Run a process.
	 * @param  Process $process The process.
	 * @return [type]           [description]
	 * @deprecated
	 */
	public function run(Process $process) {
		$_SESSION['processes'][$process['id']] = serialize($process);
	}

	/**
	 * Kill a process.
	 * @param  int $pid The PID.
	 */
	public function kill($pid) {
		if (!$this->exists($pid)) {
			throw new \RuntimeException('Cannot find process with PID #'.$pid);
		}

		unset($_SESSION['processes'][$pid]);
	}
}