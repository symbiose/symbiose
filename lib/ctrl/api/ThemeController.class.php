<?php
namespace lib\ctrl\api;

/**
 * Manage themes.
 * @author $imon
 */
class ThemeController extends \lib\ApiBackController {
	/**
	 * Retrieve CSS rules for a specified theme and user interface.
	 * @param  string $theme The theme name.
	 * @param  string $ui    The user interface name.
	 */
	public function executeLoadCss($theme, $ui) {
		$fileManager = $this->managers()->getManagerOf('file');

		if (empty($theme)) {
			$themes = $this->executeGetAvailable($ui);
			$themesNames = array_keys($themes);
			$theme = $themesNames[0];
		}

		$themePath = '/usr/share/css/themes/'.$theme;
		$uiThemePath = $themePath.'/'.$ui;
		if (!$fileManager->exists($themePath)) {
			throw new \RuntimeException('Cannot find theme "'.$theme.'"');
		}
		if (!$fileManager->exists($uiThemePath)) {
			throw new \RuntimeException('The theme "'.$theme.'" doesn\'t support the interface "'.$ui.'"');
		}

		$themeFiles = array_merge(
			array_values($fileManager->readDir($themePath)),
			array_values($fileManager->readDir($uiThemePath))
		);

		$css = array();

		foreach ($themeFiles as $filepath) {
			if ($fileManager->isDir($filepath)) {
				continue;
			}
			if ($fileManager->extension($filepath) != 'css') {
				continue;
			}

			$css[] = $fileManager->read($filepath);
		}

		return array('css' => $css);
	}

	/**
	 * Get a list of available themes for a specified user interface.
	 * @param  string $ui The user interface name.
	 */
	public function executeGetAvailable($ui) {
		$fileManager = $this->managers()->getManagerOf('file');
		$configManager = $this->managers()->getManagerOf('config');

		$themesPath = '/usr/share/css/themes/';
		$themes = array();

		foreach ($fileManager->readDir($themesPath) as $filename => $filepath) {
			if (!$fileManager->isDir($filepath)
				|| !$fileManager->exists($filepath.'/'.$ui.'/')
				|| !$fileManager->exists($filepath.'/theme.xml')) {
				continue;
			}

			$configFile = $configManager->open($filepath.'/theme.xml');
			$configData = $configFile->read();

			$themes[$filename] = array(
				'name' => $configData['name'],
				'description' => $configData['description']
			);
		}

		return $themes;
	}
}