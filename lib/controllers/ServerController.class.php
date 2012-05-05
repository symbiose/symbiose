<?php
namespace lib\controllers;

/**
 * ServerController controlle le serveur.
 * @author $imon
 * @version 1.0
 *
 */
class ServerController extends \lib\ServerCallComponent {
	/**
	 * Recuperer le nom de l'hote.
	 */
	protected function getHost() {
		$this->webos->getHTTPResponse()->setData(array('host' => $this->webos->managers()->get('Server')->getHost()));
	}

	/**
	 * Recuperer la version actuelle du Webos.
	 */
	protected function getWebosVersion() {
		$this->webos->getHTTPResponse()->setData(array('version' => $this->webos->managers()->get('Server')->getWebosVersion()));
	}

	/**
	 * Recuperer des informations sur le systeme.
	 */
	protected function getSystemData() {
		$manager = $this->webos->managers()->get('Server');
		$data = array(
			'webos_name' => $manager->getWebosName(),
			'webos_version' => $manager->getWebosVersion(),
			'php_version' => $manager->getPHPVersion(),
			'required_php_version' => $manager->getRequiredPHPVersion(),
			'host' => $manager->getHost(),
			'os' => $manager->getOS(),
			'os_type' => $manager->getSystemType(),
			'free_space' => $manager->getFreeSpace()
		);
		return $data;
	}
}