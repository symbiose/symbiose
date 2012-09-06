<?php
namespace lib\models;

//On initialise les sessions
if (!isset($_SESSION['captcha']))
	$_SESSION['captcha'] = array();

/**
 * Captcha represente un captcha (code de verification).
 * @author $imon
 * @version 1.0
 */
class Captcha extends \lib\WebosComponent {
	/**
	 * Le marqueur de type question.
	 * @var int
	 */
	const TYPE_QUESTION = 1;
	/**
	 * Le marqueur de type image.
	 * @var int
	 */
	const TYPE_IMAGE = 2;

	/**
	 * L'id du captcha.
	 * @var int
	 */
	protected $id;
	/**
	 * Le resultat du captcha.
	 * @var string
	 */
	protected $result;
	/**
	 * Le type du captcha.
	 * @var int
	 */
	protected $type;

	/**
	 * Sauver le captcha.
	 * @return int L'id du captcha.
	 */
	protected function _save() {
		if (empty($this->id)) {
			$_SESSION['captcha'][] = serialize($this);
			$this->id = array_pop(array_keys($_SESSION['captcha']));
		}
		return $this->id;
	}

	/**
	 * Recuperer un captcha aleatoire de type operation mathematique.
	 * @return string La question mathematique lisible par un humain.
	 */
	protected function _generateMath() {
		$this->type = self::TYPE_QUESTION;

		$n1 = mt_rand(0,10);
		$n2 = mt_rand(0,10);
		$humanNbr = array('z&eacute;ro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix');
		$this->result = $n1 + $n2;
		$question = 'Combien font ' . $humanNbr[$n1] .' plus ' . $humanNbr[$n2] . ' ?';

		return $question;
	}

	/**
	 * Generer un nombre aleatoire.
	 * @param int $n Le nombre de chiffres.
	 * @return int
	 */
	protected function _randNbr($n) {
		return str_pad(mt_rand(0,pow(10,$n)-1),$n,'0',STR_PAD_LEFT);
	}

	/**
	 * Recuperer un captcha aleatoire de type image.
	 * @return string L'image, encodee en base 64.
	 */
	protected function _generateImage() {
		$this->type = self::TYPE_IMAGE;
		$this->result = $this->_randNbr(5);

		$size = 32;
		$marge = 15;
		$font = 'usr/share/fonts/angelina/angelina.ttf';

		$matrix_blur = array(
			array(1,1,1),
			array(1,1,1),
			array(1,1,1)
		);

		$box = imagettfbbox($size, 0, $font, $this->result);
		$largeur = $box[2] - $box[0];
		$hauteur = $box[1] - $box[7];
		$largeur_lettre = round($largeur/strlen($this->result));

		$img = imagecreate($largeur+$marge, $hauteur+$marge);
		$blanc = imagecolorallocate($img, 255, 255, 255);
		$noir = imagecolorallocate($img, 0, 0, 0);

		$colors = array(
			imagecolorallocate($img, 0x99, 0x00, 0x66),
			imagecolorallocate($img, 0xCC, 0x00, 0x00),
			imagecolorallocate($img, 0x00, 0x00, 0xCC),
			imagecolorallocate($img, 0x00, 0x00, 0xCC),
			imagecolorallocate($img, 0xBB, 0x88, 0x77)
		);

		for($i = 0; $i < strlen($this->result); ++$i) {
			$l = $this->result[$i];
			$angle = mt_rand(-35,35);
			imagettftext($img, mt_rand($size-7,$size), $angle, ($i*$largeur_lettre)+$marge, $hauteur+mt_rand(0,$marge/2), $colors[array_rand($colors)], $font, $l);
		}

		//imageline($img, 2, mt_rand(2,$hauteur), $largeur+$marge, mt_rand(2,$hauteur), $noir);
		//imageline($img, 2, mt_rand(2,$hauteur), $largeur+$marge, mt_rand(2,$hauteur), $noir);

		imageconvolution($img, $matrix_blur, 9, 0);
		//imageconvolution($img, $matrix_blur, 9, 0);

		// start buffering
		ob_start();
		imagepng($img);
		$contents = ob_get_contents();
		ob_end_clean();

		imagedestroy($img);

		return base64_encode($contents);
	}

	/**
	 * Generer le captcha.
	 * @return string Le captcha.
	 */
	public function generate() {
		if (extension_loaded('gd') && function_exists('gd_info')) {
			$result = $this->_generateImage();
		} else {
			$result = $this->_generateMath();
		}

		$this->_save();

		return $result;
	}

	/**
	 * Recuperer l'id du captcha.
	 * @return int
	 */
	public function getId() {
		return $this->id;
	}

	/**
	 * Recuperer le type du captcha.
	 * @return bool
	 */
	public function getType() {
		return $this->type;
	}

	/**
	 * Verifier le captcha.
	 * @param string $value Le valeur a tester.
	 * @return bool Vrai si le captcha est verifie.
	 */
	public function check($value) {
		return ($value == $this->result);
	}
}