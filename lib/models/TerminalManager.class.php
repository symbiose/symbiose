<?php
namespace lib\models;

//On initialise les sessions
if (!isset($_SESSION['terminals']))
	$_SESSION['terminals'] = array();

/**
 * TerminalManager permet de gerer les terminaux.
 * @author $imon
 * @version 1.0
 */
class TerminalManager extends \lib\Manager {
	/**
	 * Determiner si un terminal existe.
	 * @param int $id L'ID du terminal.
	 * @return bool Vrai si le terminal existe.
	 */
	public function isTerminal($id) {
		return array_key_exists($id, $_SESSION['terminals']);
	}

	/**
	 * Recuperer un terminal.
	 * @param int $id L'ID du terminal.
	 * @return bool|Terminal Le terminal s'il existe, faux sinon.
	 */
	public function getTerminal($id) {
		if ($this->isTerminal($id)) {
			$terminal = unserialize($_SESSION['terminals'][$id]);
			$terminal->setWebos($this->webos);
			return $terminal;
		} else
			return false;
	}
}