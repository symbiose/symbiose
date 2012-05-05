<?php
namespace lib\models;

/**
 * ProcessManager gere les processus.
 * @author $imon
 * @version 1.0
 */
class ProcessManager extends \lib\Manager {
	/**
	 * Determine si un processus existe.
	 * @param int $pid Le PID du processus.
	 * @return bool Vrai si le processus existe.
	 */
	public function exists($pid) {
		return array_key_exists($pid, $_SESSION['processes']);
	}

	/**
	 * Recuperer un processus.
	 * @param int $pid Le PID du processus.
	 * @return Process Le processus
	 */
	public function get($pid) {
		if (!self::exists($pid))
			return false;
		else {
			$process = unserialize($_SESSION['processes'][$pid]);
			$process->setWebos($this->webos);
			return $process;
		}
	}

	/**
	 * Retourne la liste de tous les processus.
	 */
	public function getAll() {
		$list = array();
		foreach($_SESSION['processes'] as $pid => $process) {
			$list[] = $this->get($pid);
		}
		return $list;
	}
}