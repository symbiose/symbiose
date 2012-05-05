<?php
namespace lib\models;

/**
 * ServerManager gere le serveur.
 * @author $imon
 * @version 1.0
 */
class ServerManager extends \lib\Manager {
	/**
	 * Recuperer le nom de l'hote.
	 * @return string Le nom de l'hote.
	 */
	public function getHost() {
		return $_SERVER['SERVER_NAME'];
	}

	/**
	 * Recuperer le nom du webos.
	 * @return string Le nom du webos.
	 */
	public function getWebosName() {
		return 'Symbiose';
	}

	/**
	 * Recuperer la version actuelle du Webos.
	 * @return string La version du Webos.
	 */
	public function getWebosVersion() {
		return $this->webos->managers()->get('File')->get('/etc/version.txt')->contents();
	}

	/**
	 * Recuperer la version actuelle de PHP.
	 * @return string La version actuelle de PHP.
	 */
	public function getPHPVersion() {
		return PHP_VERSION;
	}

	/**
	 * Recuperer l'id de la version actuelle de PHP.
	 * @return string L'id de la version actuelle de PHP.
	 */
	public function getPHPVersionId() {
		if (defined('PHP_VERSION_ID')) {
			return PHP_VERSION_ID;
		}

		$version = $this->getPHPVersion();
		return ($version[0] * 10000 + $version[1] * 100 + $version[2]);
	}

	public function getRequiredPHPVersion() {
		$file = $this->webos->managers()->get('File')->get('/boot/phpversion.txt');
		return $file->contents();
	}

	/**
	 * Recuperer la charge systeme.
	 * @return array Un tableau avec la charge systeme (il y a 1, 10 et 15 minutes sous Linux, seulement actuelle pour Windows).
	 */
	public function getLoadAverage() {
		if (stristr(PHP_OS, 'win')) {
			$wmi = new COM('Winmgmts://');
			$server = $wmi->execquery('SELECT LoadPercentage FROM Win32_Processor');

			$cpu_num = 0;
			$load_total = 0;

			foreach($server as $cpu) {
				$cpu_num++;
				$load_total += $cpu->loadpercentage;
			}

			$load = round($load_total/$cpu_num);

			$sys_load = array($load);
		} else {
			$sys_load = sys_getloadavg();
		}

		return $sys_load;
	}

	/**
	 * Recuperer le nom du systeme d'exploitation.
	 * @return string Le nom du systeme d'exploitation.
	 */
	public function getOS() {
		return PHP_OS;
	}

	/**
	 * Recuperer le type du systeme d'exploitation.
	 * @return string Le type du systeme d'exploitation (3ex: i386).
	 */
	public function getSystemType() {
		return php_uname('m');
	}

	/**
	 * Recuperer l'espace disque disponible sur la partition ou est installe le webos.
	 * @return int L'espace disque disponible.
	 */
	public function getFreeSpace() {
		return disk_free_space('.');
	}
}