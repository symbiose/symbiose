<?php
namespace lib;

use \lib\entities\PackageMetadata;

interface Repository {
	public function listAll();
	public function countAll();
	public function getByName($pkgName);
	public function exists($pkgName);
}