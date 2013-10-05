<?php
namespace lib\ctrl\api;

use lib\TranslatedDOMDocument;

/**
 * Manage applications shortcuts.
 * @author $imon
 * @since 1.0alpha2
 */
class ApplicationShortcutController extends \lib\ApiBackController {
	protected function _getFavoritesConfig() {
		$configManager = $this->managers()->getManagerOf('config');
		$fileManager = $this->managers()->getManagerOf('file');

		$userFavoritesFile = '/etc/ske1/.config/favorites.xml';
		if ($this->app->user()->isLogged()) {
			if (!$fileManager->exists('~/.config/favorites.xml')) {
				if (!$fileManager->exists('~/.config/')) {
					$fileManager->mkdir('~/.config/');
				}
				$fileManager->copy($userFavoritesFile, '~/.config/favorites.xml');
			}
			$userFavoritesFile = '~/.config/favorites.xml';
		}

		return $configManager->open($userFavoritesFile);
	}

	/**
	 * Retrieve all shortcuts.
	 */
	protected function executeGet() {
		$configManager = $this->managers()->getManagerOf('config');
		$fileManager = $this->managers()->getManagerOf('file');
		$translationManager = $this->managers()->getManagerOf('translation');

		if ($this->app->user()->isLogged()) {
			$config = $configManager->open('~/.config/prefered-openers.json');
			$preferedOpeners = $config->read();
		} else {
			$preferedOpeners = array();
		}

		//Retrieve shortcut files list
		$shortcuts = $fileManager->readDir('/usr/share/applications/');
		//Initialize shortcuts list
		$list = array('applications'=> array(), 'categories' => array());

		$lang = $translationManager->language();

		//On recupere les infos pour chaque raccourci
		foreach($shortcuts as $shortcutPath) {
			if ($fileManager->isDir($shortcutPath))
				continue;

			if ($fileManager->pathinfo($shortcutPath, PATHINFO_EXTENSION) != 'xml')
				continue;

			$filename = $fileManager->pathinfo($shortcutPath, PATHINFO_FILENAME);

			$xml = new TranslatedDOMDocument;
			$xml->loadXML($fileManager->read($shortcutPath));
			$attributes = $xml->getTranslatedElementsByTagName('attribute', $lang, 'name');
			$attributesList = array();
			foreach ($attributes as $attribute) {
				$attributesList[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
			}

			$attributesList['prefered_open'] = '';
			if (array_key_exists($filename, $preferedOpeners)) {
				$opens = $preferedOpeners[$filename];
				$attributesList['prefered_open'] = $opens;

				if (array_key_exists('open', $attributesList)) {
					$attributesList['open'] .= ',' . $opens;
				} else {
					$attributesList['open'] = $opens;
				}
			}

			if (array_key_exists('visible', $attributesList) && (int) $attributesList['visible'] == 0)
				continue;

			$list['applications'][$filename] = $attributesList;
		}

		$favoritesConfig = $this->_getFavoritesConfig();

		foreach ($favoritesConfig->read() as $app => $value) {
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

		//Retrieve categories list
		$categories = $fileManager->readDir('/usr/share/categories/');

		foreach($categories as $shortcutPath) {
			if ($fileManager->isDir($shortcutPath))
				continue;

			if ($fileManager->pathinfo($shortcutPath, PATHINFO_EXTENSION) != 'xml')
				continue;

			$xml = new TranslatedDOMDocument;
			$xml->loadXML($fileManager->read($shortcutPath));
			$attributes = $xml->getTranslatedElementsByTagName('attribute', $lang, 'name');
			$attributesList = array();
			foreach ($attributes as $attribute) {
				$attributesList[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
			}

			if (array_key_exists('visible', $attributesList) && (int) $attributesList['visible'] == 0)
				continue;

			$list['categories'][] = $attributesList;
		}

		return $list;
	}

	/**
	 * Add an application to favorites.
	 * @param string $name The application's name.
	 * @param int $position The application's position in favorites.
	 */
	protected function executeSetFavorite($name, $position) {
		if (!$this->app->user()->isLogged())
			throw new \RuntimeException('Cannot add an application to favorites : you\'re not logged in');

		$favoritesConfig = $this->_getFavoritesConfig();

		$previousRanking = $favoritesConfig->read();

		$previousRanking[$name] = (int) $position;

		asort($previousRanking, \SORT_NUMERIC);

		$newRanking = array();

		$diff = 0;
		$last = 0;
		foreach ($previousRanking as $app => $pos) {
			$pos = (int) $pos;

			if ($last + 1 < $pos) {
				$diff -= $pos - $last;
			}
			if ($last == $pos) {
				$diff++;
			}

			$newRanking[$app] = $pos + $diff;
			$last = $pos;
		}

		$favoritesConfig->write($newRanking);
	}

	/**
	 * Remove an application from favorites.
	 * @param string $name The application's name.
	 */
	protected function executeRemoveFavorite($name) {
		if (!$this->app->user()->isLogged())
			throw new \RuntimeException('Cannot remove an application from favorites : you\'re not logged in');

		$favoritesConfig = $this->_getFavoritesConfig();

		$ranking = $favoritesConfig->read();

		if (isset($ranking[$name])) {
			unset($ranking[$name]);
		}

		$favoritesConfig->write($ranking);
	}
}
