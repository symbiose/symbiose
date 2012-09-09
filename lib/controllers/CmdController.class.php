<?php
namespace lib\controllers;

/**
 * CmdController permet de controller les commandes.
 * @author $imon
 * @version 1.0
 */
class CmdController extends \lib\ServerCallComponent {
	/**
	 * Executer une commande.
	 * @param string $cmdText La commande.
	 * @param int $terminalId L'id du terminal ou executer le commande.
	 */
	protected function execute($cmdText, $terminalId) {
		if (!$this->webos->managers()->get('Terminal')->isTerminal($terminalId)) {
			$terminal = new \lib\models\Terminal($this->webos, $terminalId);
		} else {
			$terminal = $this->webos->managers()->get('Terminal')->getTerminal($terminalId);
		}

		$this->webos->managers()->get('Cmd')->execute($cmdText, $terminal);
	}
}