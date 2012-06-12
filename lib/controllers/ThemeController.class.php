<?php
namespace lib\controllers;

class ThemeController extends \lib\ServerCallComponent {
	protected function loadCss($theme, $ui) {
		$themePath = '/usr/share/css/themes/'.$theme;
		$uiThemePath = $themePath.'/'.$ui;
		if (!$this->webos->managers()->get('File')->exists($themePath)) {
			throw new \InvalidArgumentException('Le th&egrave;me "'.$theme.'" n\'existe pas');
		}
		if (!$this->webos->managers()->get('File')->exists($uiThemePath)) {
			throw new \InvalidArgumentException('Le th&egrave;me "'.$theme.'" ne supporte pas l\'interface "'.$ui.'"');
		}

		$css = array();

		$themeDir = $this->webos->managers()->get('File')->get($themePath);
		foreach ($themeDir->contents() as $file) {
			if ($file->isDir()) {
				continue;
			}
			if ($file->extension() != 'css') {
				continue;
			}

			$css[] = $file->contents();
		}

		$uiThemeDir = $this->webos->managers()->get('File')->get($uiThemePath);
		foreach ($uiThemeDir->contents() as $file) {
			if ($file->isDir()) {
				continue;
			}
			if ($file->extension() != 'css') {
				continue;
			}

			$css[] = $file->contents();
		}

		return array('css' => $css);
	}

	protected function getAvailable($ui) {
		$themesPath = '/usr/share/css/themes/';
		$themesDir = $this->webos->managers()->get('File')->get($themesPath);
		$themes = array();

		foreach ($themesDir->contents() as $file) {
			if (!$file->isDir()) {
				continue;
			}
			if (!$this->webos->managers()->get('File')->exists($file->path().'/'.$ui.'/')) {
				continue;
			}
			if (!$this->webos->managers()->get('File')->exists($file->path().'/theme.xml')) {
				continue;
			}

			$config = new \lib\models\Config($this->webos);
			$config->load($file->path().'/theme.xml');

			$themes[$file->basename()] = array(
				'name' => $config->get('name'),
				'description' => $config->get('description')
			);
		}

		return $themes;
	}
}