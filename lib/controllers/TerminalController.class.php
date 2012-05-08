<?php
namespace lib\controllers;

/**
 * TerminalController permet de controller les terminaux.
 * @author $imon
 * @version 1.0
 *
 */
class TerminalController extends \lib\ServerCallComponent {
	/**
	 * Recuperer les informations fournies dans l'invite de commande (nom d'utilisateur, hote, emplacement)
	 */
	protected function getPromptData($id) {
		$location = $this->webos->managers()->get('Terminal')->getTerminal($id)->getLocation();
		return array(
			'username' => $this->webos->getUser()->getAttribute('username'),
			'host' => $_SERVER['SERVER_NAME'],
			'location' => $location
		);
	}

	/**
	 * Enregistrer un nouveau terminal.
	 * @param int $id L'ID du nouveau terminal.
	 */
	protected function register($id) {
		new \lib\models\Terminal($this->webos, $id);
		return $this->getPromptData($id);
	}
}