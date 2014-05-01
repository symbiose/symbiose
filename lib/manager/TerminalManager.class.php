<?php
namespace lib\manager;

use \lib\Manager;
use \lib\entities\Terminal;
use \lib\entities\Cmd;

/**
 * Manage terminals.
 * @author $imon
 */
abstract class TerminalManager extends Manager {
	/**
	 * Build a new command.
	 * @param  string $rawCmd     The command string.
	 * @param  int    $terminalId The terminal ID.
	 * @return Cmd                The new command.
	 */
	public function buildCmd($rawCmd, $terminalId) {
		$cmd = new Cmd;
		$cmd->setCmd($rawCmd);
		return $cmd;
	}

	/**
	 * Check if a terminal exists.
	 * @param  int  $terminalId The terminal ID.
	 * @return boolean          True if the terminal exists, false otherwise.
	 */
	abstract public function isTerminal($terminalId);

	/**
	 * Get a terminal.
	 * @param  int $terminalId The terminal ID.
	 * @return Terminal        The terminal.
	 */
	abstract public function getTerminal($terminalId);

	/**
	 * Build a new terminal.
	 * @param  int $terminalId The new terminal ID.
	 * @return Terminal        The new terminal.
	 */
	abstract public function buildTerminal($terminalId);

	/**
	 * Update a terminal.
	 * @param  Terminal $terminal The terminal with updated data.
	 */
	abstract public function updateTerminal(Terminal $terminal);

	/**
	 * Close a terminal.
	 * @param  int $terminalId The terminal ID.
	 */
	abstract public function closeTerminal($terminalId);
}