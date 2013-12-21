<?php
namespace lib\ctrl\api;

use \lib\entities\ConfiturePackageMetadata;
use \lib\entities\ConfitureRepository;
use \RuntimeException;

/**
 * Manage confiture repositories.
 * @author $imon
 */
class ConfitureRepositoryController extends \lib\ApiBackController {
	protected function _parsePackagesList(array $pkgs) {
		$list = array();

		foreach ($pkgs as $pkg) {
			$list[] = $pkg->toArray();
		}

		return $list;
	}

	protected function _parseReposList(array $repos) {
		$list = array();

		foreach ($repos as $repo) {
			$list[] = $repo->toArray();
		}

		return $list;
	}

	// GETTERS

	public function executeListAll() {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		$pkgs = $manager->listAll();

		return $this->_parsePackagesList($pkgs);
	}

	public function executeGetByName($pkgName) {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		$pkg = $manager->getByName($pkgName);

		if (empty($pkg)) {
			throw new RuntimeException('Unable to find package "'.$pkgName.'"', 404);
		}

		return $pkg->toArray();
	}

	public function executeSearch($options = array()) {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		$q = (isset($options['q'])) ? trim($options['q']) : '';
		$cat = (isset($options['cat'])) ? $options['cat'] : '';
		$sort = (isset($options['sort'])) ? $options['sort'] : 'name';
		$limit = (isset($options['limit'])) ? (int) $options['limit'] : null;

		$pkgs = $manager->listAll();
		$matches = array();

		foreach($pkgs as $pkg) {
			$pkgMatches = true;

			if (!empty($q) && strpos($pkg['title'], $q) === false) {
				$pkgMatches = false;
			}
			if (!empty($cat) && !in_array($cat, $pkg['categories'])) {
				$pkgMatches = false;
			}

			if ($pkgMatches) {
				$matches[] = $pkg;
			}
		}

		usort($matches, function($a, $b) use ($sort) {
			switch($sort) {
				case 'created':
					return - ($a['updateDate'] - $b['updateDate']); //Descending order
				case 'name':
				default:
					return strcmp($a['title'], $b['title']);
			}
		});

		if ($limit !== null) {
			$matches = array_slice($matches, 0, $limit);
		}

		return $this->_parsePackagesList($matches);
	}

	public function executeListRepositories() {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		$repos = $manager->listRepositories();

		return $this->_parseReposList($repos);
	}

	// SETTERS

	public function executeInstall($pkgName) {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		//TODO
	}

	public function executeRemove($pkgName) {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		//TODO
	}

	public function executeUpdateCache() {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		$repos = $manager->listRepositories();
		$updatedRepos = array();
		foreach ($repos as $repo) {
			$manager->updateRepositoryCache($repo);
			$updatedRepos[] = $repo['name'];
		}

		return array('updated' => $updatedRepos);
	}

	public function executeInsertRepository($repoData) {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		$repo = new ConfitureRepository(array(
			'name' => $repoData['name'],
			'url' => $repoData['url']
		));

		$manager->insertRepository($repo);

		return $repo->toArray();
	}

	public function executeDeleteRepository($repoName) {
		$manager = $this->managers()->getManagerOf('confitureRepository');

		$manager->deleteRepository($repoName);
	}
}