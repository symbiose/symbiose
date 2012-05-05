<?php
namespace lib;

/**
 * UniqueId permet de creer des IDs uniques.
 * @author $imon
 * @version 1.0
 */
class UniqueId extends \lib\WebosComponent {
	const MAX_PRECISION = 30;

	protected $id;

	/**
	 * Initialise l'ID unique.
	 * @param int $precision La longueur de l'ID
	 */
	public function __construct($precision = 10) {
		if ($precision > self::MAX_PRECISION)
			throw new InvalidArgumentException('La pr&eacute;cision de l\'ID unique ne peut pas d&eacute;passer '.self::MAX_PRECISION.' (fourni : "'.$precision.'")');
		if ($precision < 1)
			throw new InvalidArgumentException('La pr&eacute;cision de l\'ID unique doit &ecirc;tre sup&eacute;rieure &agrave; 0 (fourni : "'.$precision.'")');

		$chars = array('a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9');

		for($i = 0; $i < $precision; $i++) {
				$this->id .= $chars[rand(0, count($chars) - 1)];
		}
	}

	/**
	 * Recuperer l'ID genere.
	 * @return string L'ID.
	 */
	public function getId() {
		return $this->id;
	}
}