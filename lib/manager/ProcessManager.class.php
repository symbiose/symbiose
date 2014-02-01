<?php
namespace lib\manager;

use \lib\entities\Process;

/**
 * Manage processes.
 * @author $imon
 */
abstract class ProcessManager extends \lib\Manager {
	/**
	 * Check if a process exists.
	 * @param int $pid The PID.
	 * @return bool True if the process exists.
	 */
	abstract public function exists($pid);

	/**
	 * Get a process.
	 * @param int $pid The PID.
	 * @return Process The process.
	 */
	abstract public function get($pid);

	/**
	 * List all processes.
	 * @return array A list containing all running processes.
	 */
	abstract public function listAll();

	/**
	 * Run a process.
	 * @param  Process $process The process.
	 * @return [type]           [description]
	 * @deprecated
	 */
	abstract public function run(Process &$process);

	/**
	 * Kill a process.
	 * @param  int $pid The PID.
	 */
	abstract public function kill($pid);
}