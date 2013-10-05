<?php
namespace lib\manager;

use \lib\entities\Terminal;

if (!isset($_SESSION)) {
	session_start();
}
if (!isset($_SESSION['terminals'])) {
	$_SESSION['terminals'] = array();
}

/**
 * Manage terminals.
 * @author $imon
 */
abstract class TerminalManager extends \lib\Manager {
	public function isTerminal($terminalId) {
		return isset($_SESSION['terminals'][$terminalId]);
	}

	public function getTerminal($terminalId) {
		if (!$this->isTerminal($terminalId)) {
			throw new \RuntimeException('Terminal with id "'.$terminalId.'" doesn\'t exist');
		}

		$terminal = unserialize($_SESSION['terminals'][$terminalId]);

		return $terminal;
	}

	public function buildTerminal($terminalId) {
		if ($this->isTerminal($terminalId)) {
			throw new \RuntimeException('Terminal with id "'.$terminalId.'" already exists');
		}

		$terminal = new Terminal(array(
			'id' => $terminalId
		));

		$_SESSION['terminals'][$terminalId] = serialize($terminal);

		return $terminal;
	}

	public function updateTerminal(Terminal $terminal) {
		if (!$this->isTerminal($terminal['id'])) {
			throw new \RuntimeException('Terminal with id "'.$terminal['id'].'" doesn\'t exist');
		}

		$_SESSION['terminals'][$terminal['id']] = serialize($terminal);
	}

	public function closeTerminal($terminalId) {
		if (!$this->isTerminal($terminalId)) {
			throw new \RuntimeException('Terminal with id "'.$terminalId.'" doesn\'t exist');
		}

		unset($_SESSION['terminals'][$terminalId]);
	}
}