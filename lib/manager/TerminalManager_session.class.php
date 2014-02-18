<?php
namespace lib\manager;

use \lib\entities\Terminal;
use \lib\entities\Cmd;

class TerminalManager_session extends TerminalManager {
	public function isTerminal($terminalId) {
		$terminals = $this->dao->get('terminals');

		return isset($terminals[$terminalId]);
	}

	public function getTerminal($terminalId) {
		$terminals = $this->dao->get('terminals');

		if (!$this->isTerminal($terminalId)) {
			throw new \RuntimeException('Terminal with id "'.$terminalId.'" doesn\'t exist');
		}

		$terminal = unserialize($terminals[$terminalId]);

		return $terminal;
	}

	public function buildTerminal($terminalId) {
		$terminals = $this->dao->get('terminals');

		if ($this->isTerminal($terminalId)) {
			throw new \RuntimeException('Terminal with id "'.$terminalId.'" already exists');
		}

		$terminal = new Terminal(array(
			'id' => $terminalId
		));

		$terminals[$terminalId] = serialize($terminal);
		$this->dao->set('terminals', $terminals);

		return $terminal;
	}

	public function updateTerminal(Terminal $terminal) {
		$terminals = $this->dao->get('terminals');

		if (!$this->isTerminal($terminal['id'])) {
			throw new \RuntimeException('Terminal with id "'.$terminal['id'].'" doesn\'t exist');
		}

		$terminals[$terminal['id']] = serialize($terminal);
		$this->dao->set('terminals', $terminals);
	}

	public function closeTerminal($terminalId) {
		$terminals = $this->dao->get('terminals');

		if (!$this->isTerminal($terminalId)) {
			throw new \RuntimeException('Terminal with id "'.$terminalId.'" doesn\'t exist');
		}

		unset($terminals[$terminalId]);
		$this->dao->set('terminals', $terminals);
	}
}