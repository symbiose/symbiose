<?php
namespace lib\models;

/**
 * Terminal represente un terminal.
 * @author $imon
 * @version 1.0
 *
 */
class Terminal extends \lib\WebosComponent {
	protected $id;
	protected $location;

	/**
	 * Initialiser le terminal.
	 * @param Webos $webos Le webos.
	 * @param int $id L'ID du terminal.
	 */
	public function __construct(\lib\Webos $webos, $id) {
		parent::__construct($webos);

		$this->id = $id;

		if ($this->webos->getUser()->isConnected()) {
			$this->location = '~';
		} else {
			$this->location = '/';
		}

		$this->_remember();
	}

	/**
	 * Recuperer l'ID du terminal.
	 */
	public function getId() {
		return $this->id;
	}

	/**
	 * Garder le terminal en session.
	 */
	protected function _remember() {
		$_SESSION['terminals'][$this->id] = serialize($this);
	}

	/**
	 * Recuperer le dossier actuel du terminal.
	 */
	public function getLocation() {
		return $this->location;
	}

	/**
	 * Changer de dossier.
	 * @param string $location Le nouveau dossier.
	 */
	public function changeLocation($location) {
		$file = $this->webos->managers()->get('File')->get($location);

		if (!$file->isDir())
			throw new \InvalidArgumentException('"'.$location.'" : est un fichier');

		$this->location = $file->path();

		$this->_remember();
	}

	/**
	 * Recuperer le chemin absolu d'un fichier.
	 * @param string $location Le fichier.
	 */
	public function getAbsoluteLocation($location) {
		if (preg_match('#^[/~]#', $location)) //Chemin absolu
			return $location;
		else { //Chemin relatif
			$actualLocation = $this->webos->managers()->get('File')->get($this->getLocation());
			return $actualLocation->relativePath($location);
		}
	}
}