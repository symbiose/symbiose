<?php
namespace lib\controllers;

/**
 * PackageController permet de controller les paquets.
 * @author $imon
 * @version 1.0
 *
 */
class PackageController extends \lib\ServerCallComponent {
	/**
	 * Recuperer la liste des paquets disponibles.
	 */
	protected function getAvailable() {
		$list = $this->webos->managers()->get('Package')->getPackages();
		foreach($list as $key => $package) {
			$list[$key] = $this->_packageToArray($package);
		}
		$this->webos->getHTTPResponse()->setData($list);
	}

	/**
	 * Recuperer les informations sur un paquet.
	 * @param string $name Le nom du paquet.
	 */
	protected function getPackage($name) {
		$package = $this->webos->managers()->get('Package')->getPackage($name);
		$this->webos->getHTTPResponse()->setData($this->_packageToArray($package));
	}

	/**
	 * Recuperer tous les paquets d'une categorie.
	 * @param string $name Le nom de la categorie.
	 */
	protected function getFromCategory($name) {
		$list = $this->webos->managers()->get('Package')->getPackages();
		$categoryList = array();
		foreach($list as $key => $package) {
			if ($package->getAttribute('category') == $name)
				$categoryList[$key] = $this->_packageToArray($package);
			else
				unset($list[$key]);
		}
		$this->webos->getHTTPResponse()->setData($categoryList);
	}

	/**
	 * Recuperer la liste des derniers paquets parus.
	 * @param int $limit Le nombre de paquets a renvoyer.
	 */
	protected function getLastPackages($limit = 30) {
		$list = $this->webos->managers()->get('Package')->getPackages();
		$orderedList = array();
		foreach($list as $key => $package) {
			//On associe un timestamp a un paquet
			$orderedList[(int) $package->getAttribute('lastupdate')] = array($package->getName(), $this->_packageToArray($package));
		}

		//On trie les timestamp
		ksort($orderedList);

		//On ne prend que les derniers
		$list = array_slice($orderedList, - $limit);

		//On les trie dans le bon ordre
		$list = array_reverse($list, true);

		foreach($list as $key => $packageData) {
			unset($list[$key]);
			$list[$packageData[0]] = $packageData[1];
		}

		$this->webos->getHTTPResponse()->setData($list);
	}

	/**
	 * Recuperer la liste des paquets installes.
	 */
	protected function getInstalled() {
		$list = $this->webos->managers()->get('Package')->getPackages();
		foreach($list as $key => $package) {
			if ($package->isInstalled())
				$list[$key] = $this->_packageToArray($package);
			else
				unset($list[$key]);
		}

		$this->webos->getHTTPResponse()->setData($list);
	}

	/**
	 * Rechercher des paquets.
	 * @param string $query La recherche.
	 */
	protected function searchPackages($search) {
		$queries = preg_split('/,\s*/', $search);

		foreach ($queries as $key => $query) {
			$words = preg_split('/[\s,]+/', $query);
			$queries[$key] = $words;
		}

		$results = array();

		$list = $this->webos->managers()->get('Package')->getPackages();
		foreach($list as $key => $package) {
			$attributes = $package->getAttributes();
			foreach($attributes as $attr) {
				foreach ($queries as $words) {
					foreach($words as $word) {
						if (stripos($attr, $word) === false) {
							continue 2;
						}
					}

					$results[$key] = $this->_packageToArray($package);
					continue 3; //On ne recherche pas d'autres occurences sur ce paquet, on passe au suivant.
				}
			}
		}

		$this->webos->getHTTPResponse()->setData($results);
	}

	/**
	 * Installer un paquet.
	 * @param string $package Le nom du paquet.
	 */
	protected function install($package, $repository = null) {
		if (!$this->webos->managers()->get('Package')->isPackage($package))
			throw new \InvalidArgumentException('Le paquet "'.$package.'" n\'existe pas');

		if (empty($repository)) {
			$package = $this->webos->managers()->get('Package')->getPackage($package);
		} else {
			if (!$this->webos->managers()->get('Package')->isRepository($repository))
				throw new \InvalidArgumentException('Le d&eacute;p&ocirc;t "'.$repository.'" n\'existe pas');

			$repo = $this->webos->managers()->get('Package')->getRepository($repository);
			if (!$repo->isPackage($package))
				throw new \InvalidArgumentException('Le paquet "'.$package.'" du d&eacute;p&ocirc;t "'.$repository.'" n\'existe pas');

			$package = $repo->getPackage($package);
		}

		if ($package->isInstalled()) {
			throw new \InvalidArgumentException('Le paquet "'.$package->getName().'" est d&eacute;j&agrave; install&eacute;');
		}

		$package->install();
	}


	/**
	 * Supprimer un paquet.
	 * @param string $package Le nom du paquet.
	 */
	protected function remove($package) {
		if (!$this->webos->managers()->get('Package')->getLocalRepository()->isPackage($package))
			throw new \InvalidArgumentException('Le paquet "'.$package.'" n\'existe pas');

		$package = $this->webos->managers()->get('Package')->getLocalRepository()->getPackage($package);

		if (!$package->isInstalled()) {
			throw new \InvalidArgumentException('Le paquet "'.$package->getName().'" n\'est pas install&eacute;');
		}

		$package->remove();
	}

	/**
	 * Recuperer la liste des derniers paquets installes.
	 * @param $limit Le nombre maximum de paquets a recuperer.
	 */
	protected function getLastInstalled($limit = 30) {
		$list = $this->webos->managers()->get('Package')->getPackages();
		$orderedList = array();
		foreach($list as $key => $package) {
			if ($package->isInstalled())
				$orderedList[(int) $package->getAttribute('installed_time')] = array($package->getName(), $this->_packageToArray($package));
		}

		//On trie les timestamp
		ksort($orderedList);

		//On ne prend que les derniers
		$list = array_slice($orderedList, - $limit);

		//On les trie dans le bon ordre
		$list = array_reverse($list, true);

		foreach($list as $key => $packageData) {
			unset($list[$key]);
			$list[$packageData[0]] = $packageData[1];
		}

		$this->webos->getHTTPResponse()->setData($list);
	}

	/**
	 * Recuperer la liste des mises a jour disponibles.
	 */
	protected function getUpdates() {
		$list = $this->webos->managers()->get('Package')->getUpdates();
		foreach($list as $key => $package) {
			$list[$key] = $this->_packageToArray($package);
		}

		$this->webos->getHTTPResponse()->setData($list);
	}

	/**
	 * Mettre a jour le cache.
	 */
	protected function updateCache() {
		$this->webos->managers()->get('Package')->update();
	}

	/**
	 * Installer toutes les mises a jour.
	 */
	protected function upgrade() {
		$list = $this->webos->managers()->get('Package')->getUpdates();
		foreach($list as $key => $package) {
			$package->install();
		}
	}

	/**
	 * Recuperer la liste des depots.
	 */
	protected function getRepositories() {
		$repositories = $this->webos->managers()->get('Package')->getRepositories();
		$repositoriesData = array();

		foreach ($repositories as $repository) {
			if ($repository instanceof \lib\models\LocalRepository) {
				continue;
			}

			$data = $repository->getAttributes();
			$data['source'] = $repository->getSource();
			$repositoriesData[] = $data;
		}

		return $repositoriesData;
	}

	/**
	 * Enlever un depot.
	 * @param string $source L'URL du depot.
	 */
	protected function removeRepository($source) {
		$repository = $this->webos->managers()->get('Package')->getRepository($source);
		$repository->remove();
	}

	/**
	 * Ajouter un depot.
	 * @param string $source L'URL du depot.
	 */
	protected function addRepository($source) {
		$this->webos->managers()->get('Package')->addRepository($source);
	}

	/**
	 * Convertir un paquet en array pour renvoyer des informations pour l'API.
	 * @param Package $package Le paquet.
	 * @return array Un tableau contenant des informations sur le paquet.
	 */
	protected function _packageToArray(\lib\models\Package $package) {
		$array = $package->getAttributes();
		$array['installed'] = $package->isInstalled();
		$array['checked'] = $package->isChecked();
		$array['managable'] = $package->isManagable();
		$array['repository'] = $package->getRepositorySource();
		return $array;
	}
}