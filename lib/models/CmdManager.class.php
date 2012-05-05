<?php
namespace lib\models;

/**
 * CmdManager permet de gerer les commandes.
 * @author $imon
 * @version 1.0
 *
 */
class CmdManager extends \lib\Manager {
	/**
	 * Executer une commande.
	 * @param string $cmdText La commande.
	 * @param Terminal $terminal Le terminal ou exeuter la commande.
	 */
	public function execute($cmdText, $terminal) {
		$cmd = new Cmd($this->webos, $this->webos->getAuthorization(), $cmdText, $terminal);
		$cmd->run();
	}
}