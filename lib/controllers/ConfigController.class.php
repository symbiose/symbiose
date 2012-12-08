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
		$data = array();

		if (is_array($base)) {
			$data = $base;
			$base = null;

			foreach ($data as $attribute => $value) {
				$config->set($attribute, $value);
			}
		}

		if (!$this->webos->getUser()->isConnected()) {
			if (!empty($base)) {
				$config->load($base);
				$data = $config->getConfig();
			}
		} else {
			$authorisations = $this->webos->getAuthorization();
			$readAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'read');
			$writeAuthorisation = $authorisations->getArgumentAuthorizations($path, 'file', 'write');

			if ($authorisations->can($writeAuthorisation)) {
				if (!$this->webos->managers()->get('File')->exists($path)) {
					if (strpos($path, '/', 1) !== false) {
						$dirname = preg_replace('#/[^/]*/?$#', '', $path);
					} else if (strpos($path, '/') === 0) {
						$dirname = '/';
					}
					
					$canCreateFile = true;
					if (!$this->webos->managers()->get('File')->exists($dirname)) {
						if ($authorisations->can($authorisations->getArgumentAuthorizations($dirname, 'file', 'write'))) {
							$this->webos->managers()->get('File')->createDirRecursive($dirname);
						} else {
							$canCreateFile = false;
						}
					}
					
					if ($canCreateFile) {
						if (!empty($base)) {
							$default = $this->webos->managers()->get('File')->get($base);
							$default->copy($path);
						} else {
							$file = $this->webos->managers()->get('File')->createFile($path);
							$file->setContents($config->saveXML());
						}
					}
				}

				if ($this->webos->managers()->get('File')->exists($path) && $authorisations->can($readAuthorisation)) {
					$config->load($path);
					$data = $config->getConfig();
				} else {
					if (!empty($base)) {
						$config->load($base);
						$data = $config->getConfig();
					}
				}
			} else {
				if (!empty($base)) {
					$config->load($base);
					$data = $config->getConfig();
				}
			}
		}

		return $data;
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
	 * Definir tous les parametres d'une configuration.
	 * @param string $path Le chemin vers le fichier de configuration.
	 * @param array $data Un tableau contenant les nouveaux parametres.
	 */
	protected function setConfig($path, array $data) {
		$config = new Config($this->webos);
		$config->load($path);

		foreach ($config->getConfig() as $index => $value) {
			if (!array_key_exists($index, $data)) {
				$config->remove($index);
			}
		}
		
		foreach ($data as $index => $value) {
			$config->set($index, $value);
		}

		$config->save();
	}
	
	/**
	 * Modifier plusieurs parametres d'une configuration.
	 * @param string $path Le chemin vers le fichier de configuration.
	 * @param array $set Les parametres a definir.
	 * @param array $remove Les parametres a enlever.
	 */
	protected function changeConfig($path, array $set, array $remove) {
		$config = new Config($this->webos);
		$config->load($path);
		
		foreach ($set as $index => $value) {
			$config->set($index, $value);
		}
		
		foreach ($remove as $index => $value) {
			$config->remove($index);
		}

		$config->save();
	}
}