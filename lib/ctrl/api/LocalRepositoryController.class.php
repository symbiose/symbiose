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

	public function executeGetInstalled() {
		$manager = $this->managers()->getManagerOf('localRepository');

		$pkgs = $manager->listAll();

		return $this->_parsePackagesList($pkgs);
	}
}