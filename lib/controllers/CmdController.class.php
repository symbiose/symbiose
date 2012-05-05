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
			throw new \InvalidArgumentException('Le terminal #'.$terminalId.' n\'existe pas');
		}
		$terminal = $this->webos->managers()->get('Terminal')->getTerminal($terminalId);

		$this->webos->managers()->get('Cmd')->execute($cmdText, $terminal);
	}
}