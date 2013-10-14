<?php
namespace lib\manager;

use \lib\entities\PackageMetadata;
use \RuntimeException;

class LocalRepositoryManager_jsondb extends LocalRepositoryManager {
	const PKGS_DB = 'core/packages';

	protected function _buildPackageMetadata($pkgData) {
		$pkgType = $pkgData['type'];
		$className = '\\lib\\entities\\'.ucfirst($pkgType).'PackageMetadata';

		return new $className($pkgData);
	}

	// GETTERS

	public function listAll() {
		$pkgsFile = $this->dao->open(self::PKGS_DB);

		$pkgsData = $pkgsFile->read();
		$list = array();

		foreach($pkgsData as $pkgData) {
			$list[] = $this->_buildPackageMetadata($pkgData);
		}

		return $list;
	}

	public function countAll() {
		$pkgsFile = $this->dao->open(self::PKGS_DB);

		$pkgsData = $pkgsFile->read();
		return count($pkgsData);
	}

	public function getByName($pkgName) {
		$pkgsFile = $this->dao->open(self::PKGS_DB);
		$pkgsData = $pkgsFile->read()->filter(array('name' => $pkgName));

		if (count($pkgsData) == 0) {
			return null;
		}

		return $this->_buildPackageMetadata($pkgsData[0]);
	}

	public function exists($pkgName) { //TODO: type support
		$pkgsFile = $this->dao->open(self::PKGS_DB);
		$pkgsData = $pkgsFile->read()->filter(array('name' => $pkgName));

		return (count($pkgsData) > 0);
	}

	// SETTERS

	public function insert(PackageMetadata &$pkg) {
		$pkgsFile = $this->dao->open(self::PKGS_DB);
		$items = $pkgsFile->read();

		//TODO: type support
		if ($this->exists($pkg['name'])) { //Duplicate package ?
			throw new RuntimeException('The package "'.$pkg['name'].'" is already registered');
		}

		$pkg['installed'] = true;
		$pkg['installDate'] = time();

		$item = $this->dao->createItem($pkg->toArray());
		$items[] = $item;

		$pkgsFile->write($items);
	}

	public function update(PackageMetadata &$pkg) {
		$pkgsFile = $this->dao->open(self::PKGS_DB);
		$items = $pkgsFile->read();

		$pkg['installed'] = true;
		$pkg['installDate'] = time();

		$pkgItem = $this->dao->createItem($pkg->toArray());

		foreach ($items as $i => $currentItem) {
			if ($currentItem['name'] == $pkg['name']) { //TODO: type support
				$items[$i] = $pkgItem;
				$pkgsFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find package "'.$pkg['name'].'"');
	}

	public function delete($pkgName) {
		$pkgsFile = $this->dao->open(self::PKGS_DB);
		$items = $pkgsFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['name'] == $pkgName) { //TODO: type support
				unset($items[$i]);
				$pkgsFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find package "'.$pkgName.'"');
	}
}