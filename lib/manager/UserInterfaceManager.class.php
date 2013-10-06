<?php
namespace lib\manager;

use \lib\entities\UserInterface;

/**
 * Manage user interfaces.
 * @author $imon
 */
class UserInterfaceManager extends \lib\Manager {
	/**
	 * The UIs configuration file.
	 */
	const CONFIG_FILE = '/etc/uis.json';

	/**
	 * The base dir for UIs.
	 */
	const BASE_DIR = '/boot/uis';

	protected function _getConfig() {
		$configPath = './' . self::CONFIG_FILE;

		return new \lib\JsonConfig($configPath);
	}

	protected function _buildUi($uiData) {
		return new UserInterface($uiData);
	}

	/**
	 * Get a UI.
	 * @param  string $uiName The UI name.
	 * @return array          The UI data.
	 */
	public function get($uiName) {
		$config = $this->_getConfig();
		$uis = $config->read();

		foreach($uis as $ui) {
			if ($ui['name'] == $uiName) {
				return $this->_buildUi($ui);
			}
		}
	}

	/**
	 * Get the default UI.
	 * @return array The UI data.
	 */
	public function getDefault() {
		$config = $this->_getConfig();
		$uis = $config->read();

		foreach($uis as $ui) {
			if (isset($ui['isDefault']) && $ui['isDefault'] == true) {
				return $this->_buildUi($ui);
			}
		}
	}

	/**
	 * Check if a user interface exists.
	 * @param  string $uiName The UI name.
	 * @return bool           True if the UI exists, false otherwise.
	 */
	public function exists($uiName) {
		$config = $this->_getConfig();
		$uis = $config->read();

		foreach($uis as $ui) {
			if ($ui['name'] == $uiName) {
				return true;
			}
		}

		return false;
	}

	/**
	 * List all user interfaces.
	 * @return array A list containiing all UIs.
	 */
	public function listAll() {
		$config = $this->_getConfig();
		$uis = $config->read();

		$list = array();

		foreach($uis as $ui) {
			$list[] = $this->_buildUi($ui);
		}

		return $list;
	}

	/**
	 * Get a UI's metadata.
	 * @param  string $uiName The UI name.
	 * @return array          The UI metadata.
	 */
	public function getMetadata($uiName) {
		$interfaceRoot = './'.self::BASE_DIR.'/'.$uiName;

		if (!file_exists($interfaceRoot.'/config.xml')) {
			throw new \RuntimeException('Cannot load UI metadata "'.$name.'" : unable to find configuration file "'.$interfaceRoot.'/config.xml"');
		}

		$xml = new \DOMDocument;
		$xml->loadXML(file_get_contents($interfaceRoot.'/config.xml'));

		$attributes = array(
			'name' => $uiName
		);

		$attributesTags = $xml->getElementsByTagName('attribute');
		foreach ($attributesTags as $attr) {
			$attributes[$attr->getAttribute('name')] = $attr->getAttribute('value');
		}

		return $attributes;
	}

	/**
	 * Get a UI booter.
	 * @param  string $uiName The UI name.
	 * @return array          The UI booter.
	 */
	public function getBooter($uiName) {
		$interfaceRoot = './'.self::BASE_DIR.'/'.$uiName;

		//Small tests to check that the UI is not corrupted
		if (!file_exists($interfaceRoot.'/config.xml')) {
			throw new \RuntimeException('Cannot load UI "'.$name.'" : unable to find configuration file "'.$interfaceRoot.'/config.xml"');
		}

		if (!file_exists($interfaceRoot.'/index.html')) {
			throw new \RuntimeException('Cannot load UI "'.$name.'" : unable to find file "'.$interfaceRoot.'/index.html"');
		}

		//UI configuration
		$xml = new \DOMDocument;
		$xml->loadXML(file_get_contents($interfaceRoot.'/config.xml'));

		$attributes = array();
		$attributesTags = $xml->getElementsByTagName('attribute');
		foreach ($attributesTags as $attr) {
			$attributes[$attr->getAttribute('name')] = $attr->getAttribute('value');
		}

		//Included files
		$jsFiles = array();
		$cssFiles = array();

		$includesTags = $xml->getElementsByTagName('includes')->item(0)->getElementsByTagName('file');
		foreach ($includesTags as $include) {
			$filePath = './'.$include->getAttribute('path');
			$fileContents = file_get_contents($filePath);

			switch(pathinfo($filePath, PATHINFO_EXTENSION)) {
				case 'js':
					$jsFiles[$filePath] = $fileContents;
					break;
				case 'css':
					$cssFiles[] = $fileContents;
					break;
			}
		}

		//UI's content (HTML code)
		$html = file_get_contents($interfaceRoot.'/index.html');

		//Javascript code
		if (file_exists($interfaceRoot.'/index.js')) {
			$jsFiles[$interfaceRoot.'/index.js'] = file_get_contents($interfaceRoot.'/index.js');
		}

		return array(
			'html' => $html,
			'js' => $jsFiles,
			'css' => $cssFiles,
			'attributes' => $attributes
		);
	}

	/**
	 * Insert a UI.
	 * @param  UserInterface $ui The user interface.
	 */
	public function insert(UserInterface $ui) {
		if ($this->exists($ui['name'])) {
			throw new \RuntimeException('The user interface "'.$ui['name'].'" already exists');
		}

		$config = $this->_getConfig();
		$uis = $config->read();

		$uis[] = $ui->toArray();

		$config->write($uis);
	}

	/**
	 * Update a UI.
	 * @param  UserInterface $ui The user interface.
	 */
	public function update(UserInterface $ui) {
		$config = $this->_getConfig();
		$uis = $config->read();

		foreach ($uis as $i => $currentUi) {
			if ($currentUi['name'] == $ui['name']) {
				$uis[$i] = $ui->toArray();
				$config->write($uis);
				return;
			}
		}

		throw new \RuntimeException('The user interface "'.$ui['name'].'" doesn\'t exist');
	}

	/**
	 * Delete a UI.
	 * @param  string $uiName The UI name.
	 */
	public function delete($uiName) {
		$config = $this->_getConfig();
		$uis = $config->read();

		foreach ($uis as $i => $currentUi) {
			if ($currentUi['name'] == $uiName) {
				unset($uis[$i]);
				$config->write(array_values($uis));
				return;
			}
		}

		throw new \RuntimeException('The user interface "'.$uiName.'" doesn\'t exist');
	}
}