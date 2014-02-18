<?php
namespace lib\ctrl\api;

/**
 * Manage local repository.
 * @author $imon
 */
class LocalRepositoryController extends \lib\ApiBackController {
	protected function _parsePackagesList(array $pkgs) {
		$list = array();

		foreach ($pkgs as $pkg) {
			$list[] = $pkg->toArray();
		}

		return $list;
	}

	public function executeListInstalled() {
		$manager = $this->managers()->getManagerOf('localRepository');

		$pkgs = $manager->listAll();

		return $this->_parsePackagesList($pkgs);
	}

	public function executeGetInstalled($pkgName) {
		$manager = $this->managers()->getManagerOf('localRepository');

		$pkg = $manager->getByName();

		return $pkg->toArray();
	}
}