<?php
namespace lib\manager;

use \lib\entities\Process;

class ProcessManager_session extends ProcessManager {
	/**
	 * Check if a process exists.
	 * @param int $pid The PID.
	 * @return bool True if the process exists.
	 */
	public function exists($pid) {
		$processes = $this->dao->get('processes');

		return array_key_exists($pid, $processes);
	}

	/**
	 * Get a process.
	 * @param int $pid The PID.
	 * @return Process The process.
	 */
	public function get($pid) {
		$processes = $this->dao->get('processes');

		if (!$this->exists($pid))
			return null;
		else {
			return unserialize($processes[$pid]);
		}
	}

	/**
	 * List all processes.
	 * @return array A list containing all running processes.
	 */
	public function listAll() {
		$processes = $this->dao->get('processes');

		$list = array();
		foreach($processes as $pid => $proc) {
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
	public function run(Process &$process) {
		$processes = $this->dao->get('processes');

		//Generate a new process id
		end($processes);
		$process['id'] = (empty($processes)) ? 0 : key($processes) + 1;

		$processes[$process['id']] = serialize($process);
		$this->dao->set('processes', $processes);
	}

	/**
	 * Kill a process.
	 * @param  int $pid The PID.
	 */
	public function kill($pid) {
		$processes = $this->dao->get('processes');

		if (!$this->exists($pid)) {
			throw new \RuntimeException('Cannot find process with PID #'.$pid);
		}

		unset($processes[$pid]);
		$this->dao->set('processes', $processes);
	}
}