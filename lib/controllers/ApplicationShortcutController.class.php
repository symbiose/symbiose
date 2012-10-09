<?php
namespace lib\controllers;

use lib\models\Config;

/**
 * Permet d'effectuer des actions sur les raccourcis des applications.
 * @author $imon
 * @version 1.0
 */
class ApplicationShortcutController extends \lib\ServerCallComponent {
	protected function _getFavoritesConfig() {
		$userFavoritesFile = $this->webos->managers()->get('File')->get('/etc/ske1/.config/favorites.xml');
		if ($this->webos->getUser()->isConnected()) {
			if (!$this->webos->managers()->get('File')->exists('~/.config/favorites.xml')) {
				if (!$this->webos->managers()->get('File')->exists('~/.config/')) {
					$this->webos->managers()->get('File')->createDir('~/.config/');
				}
				$userFavoritesFile->copy('~/.config/favorites.xml');
			}
			$userFavoritesFile = $this->webos->managers()->get('File')->get('~/.config/favorites.xml');
		}
		$favoritesConfig = new \lib\models\Config($this->webos);
		$favoritesConfig->load($userFavoritesFile);

		return $favoritesConfig;
	}

	/**
	 * Recuperer tous les raccourcis.
	 */
	protected function get() {
		if ($this->webos->getUser()->isConnected()) {
			$path = '~/.config/prefered-openers.xml';

			$config = new Config($this->webos);

			if (!$this->webos->managers()->get('File')->exists($path)) {
				$file = $this->webos->managers()->get('File')->createFile($path);
				$file->setContents($config->saveXML());
			}

			$config->load($path);
			$preferedOpeners = $config->getConfig();
		} else {
			$preferedOpeners = array();
		}

		//On recupere la liste des raccourcis
		$applications = $this->webos->managers()->get('File')->get('/usr/share/applications/')->contents();
		//On initialise la liste
		$list = array('applications'=> array(), 'categories' => array());

		//On recupere les infos pour chaque raccourci
		foreach($applications as $shortcut) {
			if ($shortcut->isDir())
				continue;

			if ($shortcut->extension() != 'xml')
				continue;

			$xml = new \DOMDocument;
			$xml->loadXML($shortcut->contents());
			$attributes = $xml->getElementsByTagName('attribute');
			$attributesList = array();
			foreach ($attributes as $attribute) {
				$attributesList[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
			}

			$attributesList['prefered_open'] = '';
			if (array_key_exists($shortcut->filename(), $preferedOpeners)) {
				$opens = $preferedOpeners[$shortcut->filename()];
				$attributesList['prefered_open'] = $opens;

				if (array_key_exists('open', $attributesList)) {
					$attributesList['open'] .= ',' . $opens;
				} else {
					$attributesList['open'] = $opens;
				}
			}

			if (array_key_exists('visible', $attributesList) && (int) $attributesList['visible'] == 0)
				continue;

			$list['applications'][$shortcut->filename()] = $attributesList;
		}

		$favoritesConfig = $this->_getFavoritesConfig();

		foreach ($favoritesConfig->getConfig() as $app => $value) {
			if ((int) $value > 0 && array_key_exists($app, $list['applications'])) {
				$list['applications'][$app]['favorite'] = (int) $value;
			}
		}

		//On trie le tableau
		uasort($list['applications'], function($a, $b) {
			$specialChars = array('Š'=>'S', 'š'=>'s', 'Ð'=>'Dj','Ž'=>'Z', 'ž'=>'z', 'À'=>'A', 'Á'=>'A', 'Â'=>'A', 'Ã'=>'A', 'Ä'=>'A','Å'=>'A', 'Æ'=>'A', 'Ç'=>'C', 'È'=>'E', 'É'=>'E', 'Ê'=>'E', 'Ë'=>'E', 'Ì'=>'I', 'Í'=>'I', 'Î'=>'I','Ï'=>'I', 'Ñ'=>'N', 'Ò'=>'O', 'Ó'=>'O', 'Ô'=>'O', 'Õ'=>'O', 'Ö'=>'O', 'Ø'=>'O', 'Ù'=>'U', 'Ú'=>'U','Û'=>'U', 'Ü'=>'U', 'Ý'=>'Y', 'Þ'=>'B', 'ß'=>'Ss','à'=>'a', 'á'=>'a', 'â'=>'a', 'ã'=>'a', 'ä'=>'a','å'=>'a', 'æ'=>'a', 'ç'=>'c', 'è'=>'e', 'é'=>'e', 'ê'=>'e', 'ë'=>'e', 'ì'=>'i', 'í'=>'i', 'î'=>'i', 'ï'=>'i', 'ð'=>'o', 'ñ'=>'n', 'ò'=>'o', 'ó'=>'o', 'ô'=>'o', 'õ'=>'o', 'ö'=>'o', 'ø'=>'o', 'ù'=>'u', 'ú'=>'u', 'û'=>'u', 'ý'=>'y', 'ý'=>'y', 'þ'=>'b', 'ÿ'=>'y', 'ƒ'=>'f');
			$aTitle = strtr($a['title'], $specialChars);
			$bTitle = strtr($b['title'], $specialChars);
			return strcmp($aTitle, $bTitle);
		});

		//On recupere la liste des categories
		$categories = $this->webos->managers()->get('File')->get('/usr/share/categories/')->contents();

		//On recupere les infos pour cahque categorie
		foreach($categories as $shortcut) {
			if ($shortcut->isDir())
				continue;

			if ($shortcut->extension() != 'xml')
				continue;

			$xml = new \DOMDocument;
			$xml->loadXML($shortcut->contents());
			$attributes = $xml->getElementsByTagName('attribute');
			$attributesList = array();
			foreach ($attributes as $attribute) {
				$attributesList[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
			}

			if (array_key_exists('visible', $attributesList) && (int) $attributesList['visible'] == 0)
				continue;

			$list['categories'][] = $attributesList;
		}

		$this->webos->getHTTPResponse()->setData($list);
	}

	/**
	 * Ajouter une application favorite.
	 * @param string $name Le nom de l'application.
	 * @param int $position La position de l'application dans les favoris.
	 * @throws Exception
	 */
	protected function setFavorite($name, $position) {
		if (!$this->webos->getUser()->isConnected())
			throw new \Exception('Impossible de modifier les pr&eacute;f&eacute;rences d\'application, vous &ecirc;tes d&eacute;connect&eacute;');

		$favoritesConfig = $this->_getFavoritesConfig();

		$apps = $favoritesConfig->getConfig();

		$apps[$name] = (int) $position;

		asort($apps, \SORT_NUMERIC);

		$diff = 0;
		$last = 0;
		foreach ($apps as $app => $pos) {
			$pos = (int) $pos;

			if ($last + 1 < $pos) {
				$diff -= $pos - $last;
			}
			if ($last == $pos) {
				$diff++;
			}

			$favoritesConfig->set($app, $pos + $diff);
			$last = $pos;
		}

		$favoritesConfig->save('~/.config/favorites.xml');
	}

	/**
	 * Enlever une application des favoris.
	 * @param string $name Le nom de l'application.
	 * @throws Exception
	 */
	protected function removeFavorite($name) {
		if (!$this->webos->getUser()->isConnected())
			throw new \Exception('Impossible de modifier les pr&eacute;f&eacute;rences d\'application, vous &ecirc;tes d&eacute;connect&eacute;');

		$favoritesConfig = $this->_getFavoritesConfig();

		if ($favoritesConfig->exist($name)) {
			$favoritesConfig->remove($name);
		}

		$favoritesConfig->save('~/.config/favorites.xml');
	}
}
