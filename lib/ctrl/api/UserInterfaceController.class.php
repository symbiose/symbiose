<?php
namespace lib\ctrl\api;

/**
 * Manage user interfaces.
 * @author $imon
 */
class UserInterfaceController extends \lib\ApiBackController {
	/**
	 * Load the HTML structure, CSS stylesheet and Javascript script of a user interface.
	 * @param string $uiName The user interface name. If not provided, the default one will be selected.
	 */
	public function executeLoadBooter($uiName = null) {
		$manager = $this->managers()->getManagerOf('userInterface');

		if (empty($uiName)) {
			$ui = $manager->getDefault();
		} else {
			$ui = $manager->get($uiName);
		}

		if (empty($ui)) {
			throw new \RuntimeException('Cannot find ' . ((empty($uiName)) ? 'default user interface' : 'user interface "'.$uiName.'"'));
		}

		$booter = $manager->getBooter($ui['name']);

		return array(
			'name' => $ui['name'],
			'booter' => $booter
		);
	}

	/**
	 * Get a list of all available user interfaces.
	 */
	public function executeGetList() {
		$manager = $this->managers()->getManagerOf('userInterface');

		$uis = $manager->listAll();
		$list = array();

		foreach($uis as $ui) {
			try {
				$attrs = $manager->getMetadata($ui['name']);
			} catch (\Exception $e) {
				continue;
			}

			$data = $ui->toArray();
			$data['attributes'] = $attrs;
			$list[] = $data;
		}

		return $list;
	}

	/**
	 * Get a list of installed user interfaces.
	 */
	public function executeGetInstalled() {
		$manager = $this->managers()->getManagerOf('userInterface');
		$fileManager = $this->managers()->getManagerOf('file');

		$files = $fileManager->readDir('/boot/uis/');
		
		$list = array();
		foreach ($files as $filepath) {
			try {
				$attrs = $manager->getMetadata($fileManager->basename($filepath));
			} catch (\Exception $e) {
				continue;
			}
			$list[$attrs['name']] = $attrs;
		}
		
		return $list;
	}

	/**
	 * Set a UI as the default one.
	 * @param string $name The UI name.
	 * @param int $value True if the interface must be set as the default one, false otherwise.
	 */
	public function executeSetDefault($name, $value) {
		return $this->executeChangeConfig($name, array('isDefault' => $value));
	}

	/**
	 * Enable or disable a UI.
	 * @param string $name The UI name.
	 * @param int $value True to enable the UI, false to disable it.
	 */
	public function executeSetEnabled($name, $value) {
		return $this->executeChangeConfig($name, array('enabled' => $value));
	}

	/**
	 * Update the UI configuration.
	 * @param string $name The UI name.
	 * @param array $data An array containing configuration to update.
	 */
	public function executeChangeConfig($name, $data) {
		$manager = $this->managers()->getManagerOf('userInterface');

		if ($manager->exists($name)) {
			$ui = $manager->get($name);
		} else {
			$ui = new \lib\entities\UserInterface(array('name' => $name));
		}

		foreach ($data as $index => $value) {
			switch ($index) {
				case 'isDefault':
					$ui->setIsDefault($value);
					$manager->update($ui);
					break;
				case 'types':
					$ui->setLabels($value);
					$manager->update($ui);
					break;
				case 'enabled':
					if ($value) {
						$manager->insert($ui);
					} else {
						$manager->delete($ui);
					}
					break;
			}
		}
	}
}