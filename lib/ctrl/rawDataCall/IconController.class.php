<?php
namespace lib\ctrl\rawDataCall;

class IconController extends \lib\RawBackController {
	const ICONS_DIR = '/usr/share/icons';

	public function executeIndex(\lib\HTTPRequest $request) {
		$fileManager = $this->managers()->getManagerOf('file');

		if (!$request->getExists('index')) {
			$this->app->httpResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new \RuntimeException('No icon specified');
		}

		$filePath = $this->_getIconPath($request->getData('index'));

		if ($filePath === false) { //Not found
			$this->app->httpResponse()->addHeader('HTTP/1.0 404 Not Found');
			throw new \RuntimeException('Cannot find specified icon');
		}

		$this->app->httpResponse()->addHeader('Content-Type: '.$fileManager->mimetype($filePath));

		$out = $fileManager->read($filePath);
		$this->responseContent->setValue($out);
	}

	protected function _getIconPath($index) {	
		$fileManager = $this->managers()->getManagerOf('file');

		$indexData = explode('/', $index, 4);

		if (count($indexData) == 4 && $indexData[0] == 'themes') {
			$iconData = array(
				'type' => $indexData[0],
				'theme' => $indexData[1],
				'size' => $indexData[2],
				'name' => $indexData[3]
			);
		} else {
			$iconData = array(
				'type' => $indexData[0],
				'size' => $indexData[1],
				'name' => $indexData[2]
			);
		}

		//First, try to find the icon with the specified size
		$iconPath = $this->_buildFinalPath($iconData);
		if ($fileManager->exists($iconPath)) {
			return $iconPath;
		}

		//Then, try to find this icon with the specified size or greater
		$sizesAlternatives = $this->_listAlternatives($iconData, 'size');
		if (count($sizesAlternatives) > 0) {
			$iconData['size'] = $sizesAlternatives[0];
			$iconPath = $this->_buildFinalPath($iconData);
			return $iconPath;
		}

		//Try to find this icon with another size
		$altIconData = $iconData;
		$altIconData['size'] = 0;
		$sizesAlternatives = $this->_listAlternatives($altIconData, 'size');
		if (count($sizesAlternatives) > 0) {
			$iconData['size'] = end($sizesAlternatives);
			$iconPath = $this->_buildFinalPath($iconData);
			return $iconPath;
		}

		//Finally, try to find this icon within a different theme
		if (isset($iconData['theme'])) {
			$basePathData = $iconData;
			unset($basePathData['name']);
			unset($basePathData['size']);
			unset($basePathData['theme']);

			$basePath = $this->_buildPath($basePathData);
			$files = $fileManager->readDir($basePath);
			foreach($files as $filename => $filepath) {
				$iconData['theme'] = $filename;

				//Try to find this icon with the specified size or greater
				$sizesAlternatives = $this->_listAlternatives($iconData, 'size');
				if (count($sizesAlternatives) > 0) {
					$iconData['size'] = $sizesAlternatives[0];
					$iconPath = $this->_buildFinalPath($iconData);
					return $iconPath;
				}

				//Try to find this icon with another size
				$altIconData = $iconData;
				$altIconData['size'] = 0;
				$sizesAlternatives = $this->_listAlternatives($altIconData, 'size');
				if (count($sizesAlternatives) > 0) {
					$iconData['size'] = end($sizesAlternatives);
					$iconPath = $this->_buildFinalPath($iconData);
					return $iconPath;
				}
			}
		}

		return false;
	}

	protected function _listAlternatives(array $iconData, $variableKey) {
		$fileManager = $this->managers()->getManagerOf('file');

		$basePathData = $iconData;
		unset($basePathData['name']);
		unset($basePathData[$variableKey]);

		$basePath = $this->_buildPath($basePathData);

		$alternatives = array();

		$currentIconData = $iconData;

		$files = $fileManager->readDir($basePath);

		if ($variableKey == 'size') {
			ksort($files, SORT_NUMERIC);
		}

		foreach ($files as $filename => $filepath) {
			$currentIconData[$variableKey] = $filename;

			if ($variableKey == 'size') { //Check if the icon size is equal or greater
				if ((int) $filename < $iconData['size']) {
					continue;
				}
			}

			$currentIconPath = $this->_buildFinalPath($currentIconData);
			if ($fileManager->exists($currentIconPath)) {
				$alternatives[] = $currentIconData[$variableKey];
			}
		}

		return $alternatives;
	}

	protected function _buildPath(array $iconData, &$variableKeys = null) {
		$iconPathStruct = array('type', 'theme', 'size', 'name');

		$iconPath = self::ICONS_DIR;
		$variableKeys = array();

		foreach ($iconPathStruct as $key) {
			if (isset($iconData[$key])) {
				$iconPath .= '/' . $iconData[$key];
			} else {
				$variableKeys[] = $key;
			}
		}

		return $iconPath;
	}

	protected function _buildFinalPath(array $iconData) {
		return $this->_buildPath($iconData) . '.png';
	}
}