<?php
namespace lib\manager;

use lib\entities\AppLauncher;
use lib\TranslatedDOMDocument;

class LauncherManager_localfs extends LauncherManager {
	const APPS_DIR = '/usr/share/applications';
	const CATEGORIES_DIR = '/usr/share/categories';

	protected function _sortLaunchers($launchers) {
		//Sort apps
		uasort($launchers, function($a, $b) {
			$specialChars = array('Š'=>'S', 'š'=>'s', 'Ð'=>'Dj','Ž'=>'Z', 'ž'=>'z', 'À'=>'A', 'Á'=>'A', 'Â'=>'A', 'Ã'=>'A', 'Ä'=>'A','Å'=>'A', 'Æ'=>'A', 'Ç'=>'C', 'È'=>'E', 'É'=>'E', 'Ê'=>'E', 'Ë'=>'E', 'Ì'=>'I', 'Í'=>'I', 'Î'=>'I','Ï'=>'I', 'Ñ'=>'N', 'Ò'=>'O', 'Ó'=>'O', 'Ô'=>'O', 'Õ'=>'O', 'Ö'=>'O', 'Ø'=>'O', 'Ù'=>'U', 'Ú'=>'U','Û'=>'U', 'Ü'=>'U', 'Ý'=>'Y', 'Þ'=>'B', 'ß'=>'Ss','à'=>'a', 'á'=>'a', 'â'=>'a', 'ã'=>'a', 'ä'=>'a','å'=>'a', 'æ'=>'a', 'ç'=>'c', 'è'=>'e', 'é'=>'e', 'ê'=>'e', 'ë'=>'e', 'ì'=>'i', 'í'=>'i', 'î'=>'i', 'ï'=>'i', 'ð'=>'o', 'ñ'=>'n', 'ò'=>'o', 'ó'=>'o', 'ô'=>'o', 'õ'=>'o', 'ö'=>'o', 'ø'=>'o', 'ù'=>'u', 'ú'=>'u', 'û'=>'u', 'ý'=>'y', 'ý'=>'y', 'þ'=>'b', 'ÿ'=>'y', 'ƒ'=>'f');
			$aTitle = strtr($a['title'], $specialChars);
			$bTitle = strtr($b['title'], $specialChars);
			return strcmp($aTitle, $bTitle);
		});

		return $launchers;
	}

	public function listApps($lang = null) {
		//Retrieve shortcut files list
		$shortcuts = $this->dao->readDir(self::APPS_DIR);
		$apps = array();

		foreach($shortcuts as $shortcutPath) {
			if ($this->dao->isDir($shortcutPath))
				continue;

			if ($this->dao->extension($shortcutPath) != 'xml')
				continue;

			$filename = $fileManager->pathinfo($shortcutPath, PATHINFO_FILENAME);

			$xml = new TranslatedDOMDocument;
			$xml->loadXML($fileManager->read($shortcutPath));
			$attributes = $xml->getTranslatedElementsByTagName('attribute', $lang, 'name');
			$attributesList = array();
			foreach ($attributes as $attribute) {
				$attributesList[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
			}

			if (array_key_exists('visible', $attributesList) && (int) $attributesList['visible'] == 0)
				continue;

			$apps[$filename] = $attributesList;
		}

		return $this->_sortLaunchers($apps);
	}

	public function listCategories($lang = null) {
		//Retrieve shortcut files list
		$shortcuts = $this->dao->readDir(self::CATEGORIES_DIR);
		$categories = array();

		foreach($shortcuts as $shortcutPath) {
			if ($this->dao->isDir($shortcutPath))
				continue;

			if ($this->dao->extension($shortcutPath) != 'xml')
				continue;

			$filename = $fileManager->pathinfo($shortcutPath, PATHINFO_FILENAME);

			$xml = new TranslatedDOMDocument;
			$xml->loadXML($fileManager->read($shortcutPath));
			$attributes = $xml->getTranslatedElementsByTagName('attribute', $lang, 'name');
			$attributesList = array();
			foreach ($attributes as $attribute) {
				$attributesList[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
			}

			if (array_key_exists('visible', $attributesList) && (int) $attributesList['visible'] == 0)
				continue;

			$categories[] = $attributesList;
		}

		return $this->_sortLaunchers($categories);
	}

	public function insertApp(AppLauncher $app) {
		$launcherPath = self::APPS_DIR.'/'.$app['name'].'.xml';

		$xml = new TranslatedDOMDocument('1.0');
		$root = $xml->createElement('shortcut');
		$xml->appendChild($root);

		$appData = $app->toArray();
		foreach($appData as $name => $value) {
			$attrEl = $xml->createElement('attribute');
			$root->appendChild($attrEl);

			$nameAttr = $xml->createAttribute('name');
			$nameAttr->appendChild($xml->createTextNode($name));
			$attrEl->appendChild($nameAttr);

			$valueAttr = $xml->createAttribute('value');
			$valueAttr->appendChild($xml->createTextNode($value));
			$attrEl->appendChild($valueAttr);
		}

		$this->dao->write($launcherPath, $xml->saveXML());
	}

	public function updateApp(AppLauncher $app) {
		return $this->insertApp($app);
	}

	public function deleteApp($appName) {
		$launcherPath = self::APPS_DIR.'/'.$appName.'.xml';

		$this->dao->delete($launcherPath);
	}
}