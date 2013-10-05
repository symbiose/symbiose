<?php
namespace lib\ctrl\api;

/**
 * Manage terminals.
 * @author $imon
 */
class TerminalController extends \lib\ApiBackController {
	/**
	 * Get prompt data (username, host, working directory).
	 * @param int $terminalId The terminal id.
	 */
	public function executeGetPromptData($terminalId) {
		$terminalManager = $this->managers()->getManagerOf('terminal');
		$userManager = $this->managers()->getManagerOf('user');
		$user = $this->app()->user();

		$terminal = $terminalManager->getTerminal($terminalId);

		if (!$user->isLogged()) { //User not logged in
			$username = null;
		} else {
			$username = $user->username();
		}

		return array(
			'username' => $username,
			'host' => $_SERVER['SERVER_NAME'],
			'location' => $terminal['dir']
		);
	}

	/**
	 * Register a new terminal.
	 * @param int $terminalId The new terminal id.
	 * @deprecated You don't need to call this method before using a terminal anymore.
	 */
	public function executeRegister($terminalId) {
		$terminalManager = $this->managers()->getManagerOf('terminal');
		$user = $this->app()->user();

		if ($terminalManager->isTerminal($terminalId)) {
			$terminalManager->closeTerminal($terminalId);
		}

		$terminal = $terminalManager->buildTerminal($terminalId);

		$terminal['dir'] = ($user->isLogged()) ? '~' : '/';
		$terminalManager->updateTerminal($terminal);

		return $this->executeGetPromptData($terminal['id']);
	}
}