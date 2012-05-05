<?php
namespace lib\models;

/**
 * PackageManager permet de gerer les paquets.
 * @author $imon
 * @version 1.0
 */
class PackageManager extends \lib\Manager {
	protected $repositories = array();
	protected $packages = array();
	protected $updates = array();

	/**
	 * Initialise le gestionnaire de paquets.
	 * @param Webos $webos
	 */
	public function __construct(\lib\Webos $webos, $dao = null) {
		//On appelle le constructeur du parent
		parent::__construct($webos, $dao);

		//Si le cache est enregistre
		if ($this->dao->exists('/var/cache/apt/cache.txt')) {
			//On charge le cache
			$this->repositories = unserialize($this->dao->get('/var/cache/apt/cache.txt')->contents());

			$localRepository = new LocalRepository($this->webos);
			$this->repositories[$localRepository->getSource()] = $localRepository;

			foreach ($this->repositories as $repository) {
				$repository->setWebos($this->webos);
				$this->_addPackagesToCache($repository->getPackages());
			}
		} else {
			//Sinon on recupere la liste des paquets
			$this->update();
		}
	}

	/**
	 * Recuperer la liste des paquets.
	 */
	public function update() {
		echo 'Construction de la liste des paquets...'."\n";

		if (!$this->dao->exists('/etc/apt/repositories.xml')) {
			$repositories = array();
		} else {
			$xml = new \DOMDocument;
			$xml->loadXML($this->dao->get('/etc/apt/repositories.xml')->contents());
			$repositories = $xml->getElementsByTagName('repository');
		}

		$this->packages = array();
		$this->repositories = array();
		$this->updates = array();

		foreach ($repositories as $repository) {
			try {
				$repo = new RemoteRepository($this->webos, $repository->getAttribute('url'));
			} catch(\Exception $e) {
				echo 'Erreur : '.$e->getMessage()."\n";
				continue;
			}
			$this->_addPackagesToCache($repo->getPackages());
			$this->repositories[$repo->getSource()] = $repo;
		}

		//On ajoute le depot local
		$localRepository = new LocalRepository($this->webos);
		$this->_addPackagesToCache($localRepository->getPackages());
		$this->repositories[$localRepository->getSource()] = $localRepository;

		//On stocke la liste dans le cache
		$this->saveCache();
	}

	/**
	 * Ajouter des paquets a la liste des paquets.
	 * @param array $packages Les paquets a ajouter.
	 */
	protected function _addPackagesToCache($packages) {
		foreach($packages as $package) {
			if ($this->isPackage($package->getName())) { //Le paquet est deja present
				if ($package->isInstalled()) { //Ce paquet est installe
					//Le paquet disponible est plus recent que celui-ci
					if ($this->getPackage($package->getName())->getVersion()->isNewerThan($package->getVersion())) {
						//On marque le paquet disponible comme mise a jour
						$this->updates[$package->getName()] = $this->getPackage($package->getName());
					}
				} else { //Ce paquet n'est pas installe
					//Ce paquet est plus recent que celui installe
					if ($package->getVersion()->isNewerThan($this->getPackage($package->getName())->getVersion())) {
						//Si il y a une mise a jour du paquet deja disponible depuis un autre depot
						if ($this->isUpdate($package->getName())) {
							$update = $this->getUpdate($package->getName());
							//Si la mise a jour de l'autre depot est plus recente que cette mise a jour, on passe
							if ($update->getVersion()->isNewerThan($package->getVersion())) {
								continue;
							}
						}
						//On le marque comme mise a jour
						$this->updates[$package->getName()] = $package;
					} else { //Si ce paquet n'est pas plus recent, ca ne nous interesse pas
						continue;
					}
				}
			}

			//On ajoute le paquet a la liste
			$this->packages[$package->getName()] = $package;
		}
	}

	/**
	 * Recuperer un paquet.
	 * @param string $name Le nom du paquet.
	 * @return Package Le paquet.
	 */
	public function getPackage($name) {
		if ($this->isPackage($name))
			return $this->packages[$name];
		else
			return false;
	}

	/**
	 * Determine si un paquet existe.
	 * @param string $name Le nom du paquet.
	 * @return bool Vrai si le paquet existe.
	 */
	public function isPackage($name) {
		return array_key_exists($name, $this->packages);
	}

	/**
	 * Recuperer la liste de tous les paquets.
	 * @return array Un tableau contenant tous les paquets.
	 */
	public function getPackages() {
		return $this->packages;
	}

	/**
	 * Determine si un paquet a une mise a jour.
	 * @param string $name Le nom du paquet.
	 * @return bool Vrai si le paquet est une mise a jour.
	 */
	public function isUpdate($name) {
		return array_key_exists($name, $this->updates);
	}

	/**
	 * Recuperer une mise a jour.
	 * @param string $name Le nom du paquet.
	 * @return Package Le paquet.
	 */
	public function getUpdate($name) {
		if ($this->isUpdate($name))
			return $this->updates[$name];
		else
			return false;
	}

	/**
	 * Recuperer la liste des mises a jour.
	 * @return array Un tableau contenant toutes les mises a jour.
	 */
	public function getUpdates() {
		return $this->updates;
	}

	/**
	 * Enregistre le cache.
	 */
	public function saveCache() {
		$repositories = array();

		foreach ($this->repositories as $source => $repository) {
			//Si le depot n'est pas local (on n'enregistre pas dans le cache le depot local)
			if (!$repository instanceof LocalRepository)
				$repositories[$repository->getSource()] = $repository;
		}

		if (!$this->dao->exists('/var/cache/apt/cache.txt')) {
			$cache = $this->dao->createFile('/var/cache/apt/cache.txt');
		} else {
			$cache = $this->dao->get('/var/cache/apt/cache.txt');
		}

		$cache->setContents(serialize($repositories));
	}

	/**
	 * Recuperer le depot local.
	 * @return LocalRepository Le depot local.
	 */
	public function getLocalRepository() {
		foreach ($this->repositories as $repository) {
			//Si le depot est le depot local, on le retourne
			if ($repository instanceof LocalRepository)
				return $repository;
		}
	}

	/**
	 * Recuperer tous les depots.
	 * @return array Un tableau contenant les depots.
	 */
	public function getRepositories() {
		return $this->repositories;
	}

	/**
	 * Determiner si un depot existe.
	 * @param string $source L'URL du depot.
	 * @return bool Vrai si le depot existe.
	 */
	public function isRepository($source) {
		return array_key_exists($source, $this->repositories);
	}

	/**
	 * Recuperer un depot en fonction de son URL source.
	 * @param string $source L'URL du depot.
	 * @return bool|Repository Le depot s'il existe, faux sinon.
	 */
	public function getRepository($source) {
		if ($this->isRepository($source))
			return $this->repositories[$source];
		else
			return false;
	}

	/**
	 * Ajouter un depot.
	 * @param string $source L'URL du depot.
	 * @param string|bool $name Le nom du depot. Si definit a faux, il sera automatiquement determine.
	 * @return Repository Le depot.
	 */
	public function addRepository($source, $name = false) {
		$repository = new RemoteRepository($this->webos, $source);

		if (!is_string($name) || empty($name)) {
			$name = $repository->getAttribute('name');
		}

		$file = $this->webos->managers()->get('File')->get('/etc/apt/repositories.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$root = $xml->getElementsByTagName('repositories')->item(0);

		$node = $xml->createElement('repository');
		$root->appendChild($node);

		$nameAttr = $xml->createAttribute('name');
		$nameAttr->appendChild($xml->createTextNode($name));
		$node->appendChild($nameAttr);

		$url = $xml->createAttribute('url');
		$url->appendChild($xml->createTextNode($source));
		$node->appendChild($url);

		$webos = $xml->createAttribute('webos');
		$webos->appendChild($xml->createTextNode($repository->getAttribute('webos')));
		$node->appendChild($webos);

		$file->setContents($xml->saveXML());
	}
}