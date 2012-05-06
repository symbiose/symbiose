<?php
namespace lib\controllers;

class ThemeController extends \lib\ServerCallComponent {
	protected function loadCss($theme, $ui) {
		$themePath = '/usr/share/css/themes/'.$theme.'/'.$ui.'/';
		if (!$this->webos->managers()->get('File')->exists($themePath)) {
			throw new \InvalidArgumentException('Le th&egrave;me "'.$theme.'" ne supporte pas l\'interface "'.$ui.'"');
		}

		$themeDir = $this->webos->managers()->get('File')->get($themePath);
		$cssFiles = array();

		foreach ($themeDir->contents() as $file) {
			if ($file->isDir()) {
				continue;
			}
			if ($file->extension() != 'css') {
				continue;
			}

			$cssFiles[] = $file->realpath();
		}

		return array('css' => $cssFiles);
	}

	protected function _getUserConfig($ui) {
		$defaultFile = '/usr/etc/uis/'.$ui.'/config.xml';
		$userFile = '~/.theme/'.$ui.'/config.xml';

		$config = new \lib\models\Config($this->webos);

		if (!$this->webos->getUser()->isConnected()) {
			$config->load($defaultFile);
		} else {
			if (!$this->webos->managers()->get('File')->exists('~/.theme/')) {
				$this->webos->managers()->get('File')->createDir('~/.theme/');
			}

			if (!$this->webos->managers()->get('File')->exists('~/.theme/'.$ui.'/')) {
				$this->webos->managers()->get('File')->createDir('~/.theme/'.$ui.'/');
			}

			if (!$this->webos->managers()->get('File')->exists($userFile)) {
				$default = $this->webos->managers()->get('File')->get($defaultFile);
				$default->copy($userFile);
			}

			$config->load($userFile);
		}

		return $config;
	}

	protected function get($ui) {
		$config = $this->_getUserConfig($ui);
		return $config->getConfig();
	}

	protected function change($component, $value, $ui) {
		if (!$this->webos->getUser()->isConnected())
			throw new \Exception('Impossible de modifier les pr&eacute;f&eacute;rences d\'apparence, vous &ecirc;tes d&eacute;connect&eacute;');

		$config = $this->_getUserConfig($ui);

		$config->set($component, $value);

		$config->save('~/.theme/'.$ui.'/config.xml');
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