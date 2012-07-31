<?php
namespace lib;

use \lib\models\Config;

/**
 * UserInterfaceBooter est une classe basique permettant de demarrer un interface via JavaScript.
 * @author $imon
 * @version 1.0
 * @since 1.0
 */
class UserInterfaceBooter extends Webos {
	/**
	 * Afficher l'interface utilisateur (via JavaScript).
	 */
	public function run() {
		//On detecte la langue du visiteur si elle ne l'est pas
		$conf = new Config($this);
		if ($this->managers()->get('File')->exists('~/.config/locale.xml')) {
			$conf->load('~/.config/locale.xml');
		}
		if ($conf->exist('language')) {
			$this->managers()->get('Translation')->setLanguage($conf->get('language'));
		} else {
			$lang = $this->managers()->get('Translation')->detectLanguage();
			if ($this->user->isConnected()) {
				$conf->set('language', $lang);
				$conf->save('~/.config/locale.xml');
			}
		}
		
		//On recupere les fichiers JavaScript de base a inclure
		$jsIncludes = $this->_getJsBootFiles();

		ob_start();

		//On inclut le layout (structure HTMl de base)
		require('boot/includes/layout.php');

		$out = ob_get_contents();
		ob_end_clean();

		//On ajoute le HTML genere a la reponse HTTP
		$this->getHTTPResponse()->addContent($out);

		//On envoie la reponse HTTP
		$this->getHTTPResponse()->send();
	}

	/**
	 * Recuperer les fichier JavaScript de base permettant de demarrer une interface utilisateur.
	 * @return array Un tableau contenant les chemins vers les fichiers JavaScript.
	 */
	protected function _getJsBootFiles() {
		$xml = new \DOMDocument;
		$xml->load('etc/jsboot.xml');
		$includes = $xml->getElementsByTagName('include');
		$list = array();
		foreach ($includes as $include) {
			$list[] = $include->getAttribute('path');
		}
		return $list;
	}
}