<?php
namespace lib\controllers;
use lib\models\Config;
use \InvalidArgumentException;

/**
 * ConfigController permet de gerer les fichiers de configuration.
 * @author $imon
 * @version 1.0
 */
class ConfigController extends \lib\ServerCallComponent {
	/**
	 * Recuperer un parametre de configuration.
	 * @param string $path Le chemin vers le fichier de configuration.
	 * @param string $index Le parametre de configuration a recuperer.
	 * @throws InvalidArgumentException
	 */
	protected function get($path, $index) {
		$config = new Config($this->webos);
		$config->load($path);

		if (!$config->exist($index)) {
			throw new InvalidArgumentException('Le parametre de configuration "'.$index.'" est introuvable dans "'.$path.'"');
		}

		return array('value' => $config->get($index));
	}

	/**
	 * Recuperer tous les parametres d'une configuration.
	 * @param string $path Le chemin vers le fichier de configuration.
	 */
	protected function getConfig($path) {
		$config = new Config($this->webos);
		$config->load($path);

		return $config->getConfig();
	}

	/**
	 * Recuperer tous les parametres d'une configuration utilisateur.
	 * @param string $path Le chemin vers le fichier de configuration utilisateur.
	 * @param string $base Le chemin vers le fichier servant de modele si le fichier de configuration utilisateur n'existe pas.
	 */
	protected function getUserConfig($path, $base) {
		$config = new Config($this->webos);

		if (!$this->webos->getUser()->isConnected()) {
			$config->load($base);
		} else {
			$authorisations = $this->webos->getAuthorization();
			$readAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
			$writeAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'write');

			if ($authorisations->can($writeAuthorisation)) {
				if (!$this->webos->managers()->get('File')->exists($path)) {
					$default = $this->webos->managers()->get('File')->get($base);
					$default->copy($path);
				}

				if ($authorisations->can($readAuthorisation)) {
					$config->load($path);
				} else {
					$config->load($base);
				}
			} else {
				$config->load($base);
			}
		}

		return $config->getConfig();
	}

	/**
	 * Definir un parametre de configuration.
	 * @param string $path Le chemin vers le fichier de configuration.
	 * @param string $index Le parametre de configuration a modifier.
	 * @param string $value La nouvelle valeur du parametre.
	 */
	protected function set($path, $index, $value) {
		$config = new Config($this->webos);
		$config->load($path);

		$config->set($index, $value);

		$config->save();
	}

	/**
	 * Definir plusieurs parametres d'une configuration.
	 * @param string $path Le chemin vers le fichier de configuration.
	 * @param array $data Un tableau contenant les nouveaux parametres.
	 */
	protected function setConfig($path, $data) {
		$config = new Config($this->webos);
		$config->load($path);

		foreach ($data as $index => $value) {
			$config->set($index, $value);
		}

		$config->save();
	}
}