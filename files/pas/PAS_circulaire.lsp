;;; ============================================================
;;;  PAS_circulaire.lsp  -  Piege a son circulaire parametrique
;;;  Commande : PAS
;;;  Dessine : coupe longitudinale + vue de bout + cotes + nomenclature
;;;  Unites : mm
;;; ============================================================

(defun c:PAS ( / *error* oldvars x0 y0 ins DN EP L MAN R RE LT cx
               pt ln ci pl tx dimL dimV mkLayer hach
               b1 b2 c1 c2 cRE cR yN i lignes)

  ;; ---------- gestion des variables / erreurs ----------
  (setq oldvars (mapcar '(lambda (v) (cons v (getvar v)))
                        '("OSMODE" "CMDECHO" "CLAYER" "HPASSOC" "ORTHOMODE")))
  (defun *error* (msg)
    (foreach v oldvars (setvar (car v) (cdr v)))
    (if (not (member msg '("Function cancelled" "quit / exit abort")))
      (princ (strcat "\nErreur : " msg)))
    (princ))
  (setvar "CMDECHO" 0) (setvar "OSMODE" 0) (setvar "ORTHOMODE" 0) (setvar "HPASSOC" 0)

  ;; ---------- saisie des parametres ----------
  (defun ask (msg def / v)
    (setq v (getreal (strcat "\n" msg " <" (rtos def 2 0) "> : ")))
    (if v v def))
  (setq DN  (ask "Diametre nominal DN (mm)" 315.0)
        EP  (ask "Epaisseur isolant (mm)" 100.0)
        L   (ask "Longueur utile du corps (mm)" 1000.0)
        MAN (ask "Longueur des manchettes (mm)" 60.0))
  (setq ins (getpoint "\nPoint d'insertion <0,0> : "))
  (if (not ins) (setq ins '(0.0 0.0 0.0)))
  (setq x0 (car ins) y0 (cadr ins)
        R  (/ DN 2.0)
        RE (+ R EP)
        LT (+ L MAN MAN)
        cx (+ LT RE 500.0))

  ;; ---------- helpers ----------
  (defun pt (x y) (list (+ x0 x) (+ y0 y) 0.0))
  (defun ln (a b lay)
    (entmakex (list '(0 . "LINE") (cons 8 lay) (cons 10 a) (cons 11 b))))
  (defun ci (c r lay)
    (entmakex (list '(0 . "CIRCLE") (cons 8 lay) (cons 10 c) (cons 40 r))))
  (defun pl (pts lay)
    (entmakex (append
      (list '(0 . "LWPOLYLINE") '(100 . "AcDbEntity") (cons 8 lay)
            '(100 . "AcDbPolyline") (cons 90 (length pts)) '(70 . 1))
      (mapcar '(lambda (p) (cons 10 (list (car p) (cadr p)))) pts))))
  (defun tx (s p h lay centre)
    (entmakex (list '(0 . "TEXT") (cons 8 lay) (cons 10 p) (cons 11 p)
                    (cons 40 h) (cons 1 s) '(7 . "Standard")
                    (cons 72 (if centre 1 0)) (cons 73 (if centre 2 0)))))
  (defun mkLayer (nom col lt)
    (if (and lt (not (tblsearch "LTYPE" lt)))
      (command "_.-LINETYPE" "_L" lt "acadiso.lin" ""))
    (command "_.-LAYER" "_M" nom "_C" col "" "_LT" (if lt lt "Continuous") "" ""))
  (defun hach (ents)
    (setvar "CLAYER" "PAS-LAINE")
    (command "_.-HATCH" "_P" "ANSI37" 15 0 "_S")
    (foreach e ents (command e))
    (command "" "")
    (foreach e ents (entdel e)))
  (defun dimL (a b loc)
    (command "_.DIMLINEAR" a b "_H" loc))
  (defun dimV (a b loc txt)
    (if txt
      (command "_.DIMLINEAR" a b "_V" "_T" txt loc)
      (command "_.DIMLINEAR" a b "_V" loc)))

  ;; ---------- calques ----------
  (mkLayer "PAS-CONTOUR" "7" nil)
  (mkLayer "PAS-PERFORE" "3" "DASHED")
  (mkLayer "PAS-AXE"     "1" "CENTER")
  (mkLayer "PAS-LAINE"   "2" nil)
  (mkLayer "PAS-COTES"   "4" nil)
  (mkLayer "PAS-TEXTE"   "7" nil)
  (setvar "LTSCALE" 10.0)

  ;; ---------- style de cote ----------
  (setvar "DIMSCALE" 10.0) (setvar "DIMTXT" 2.5) (setvar "DIMASZ" 2.0)
  (setvar "DIMEXO" 1.0) (setvar "DIMEXE" 1.5) (setvar "DIMGAP" 0.8)
  (setvar "DIMDEC" 0) (setvar "DIMTIH" 0) (setvar "DIMTOH" 0) (setvar "DIMTAD" 1)
  (if (tblsearch "DIMSTYLE" "PAS")
    (command "_.-DIMSTYLE" "_S" "PAS" "_Y")
    (command "_.-DIMSTYLE" "_S" "PAS"))

  ;; =========== COUPE LONGITUDINALE ===========
  ;; manchettes
  (foreach s '(1.0 -1.0)
    (ln (pt 0 (* s R)) (pt MAN (* s R)) "PAS-CONTOUR")
    (ln (pt (+ MAN L) (* s R)) (pt LT (* s R)) "PAS-CONTOUR")
    ;; enveloppe exterieure
    (ln (pt MAN (* s RE)) (pt (+ MAN L) (* s RE)) "PAS-CONTOUR")
    ;; flasques
    (ln (pt MAN (* s R)) (pt MAN (* s RE)) "PAS-CONTOUR")
    (ln (pt (+ MAN L) (* s R)) (pt (+ MAN L) (* s RE)) "PAS-CONTOUR")
    ;; tole perforee
    (ln (pt MAN (* s R)) (pt (+ MAN L) (* s R)) "PAS-PERFORE")
    ;; reperes joints EPDM
    (ln (pt 20 (* s R)) (pt 20 (* s (+ R 8))) "PAS-CONTOUR")
    (ln (pt (- LT 20) (* s R)) (pt (- LT 20) (* s (+ R 8))) "PAS-CONTOUR"))
  ;; hachures laine
  (setq b1 (pl (list (pt MAN R) (pt (+ MAN L) R) (pt (+ MAN L) RE) (pt MAN RE)) "PAS-LAINE")
        b2 (pl (list (pt MAN (- R)) (pt (+ MAN L) (- R)) (pt (+ MAN L) (- RE)) (pt MAN (- RE))) "PAS-LAINE"))
  (hach (list b1))
  (hach (list b2))
  ;; axe
  (ln (pt -60 0) (pt (+ LT 60) 0) "PAS-AXE")

  ;; =========== VUE DE BOUT ===========
  (setq cRE (ci (pt cx 0) RE "PAS-CONTOUR")
        cR  (ci (pt cx 0) R  "PAS-PERFORE"))
  (setq c1 (ci (pt cx 0) RE "PAS-LAINE")
        c2 (ci (pt cx 0) R  "PAS-LAINE"))
  (hach (list c1 c2))
  (ln (pt (- cx RE 50) 0) (pt (+ cx RE 50) 0) "PAS-AXE")
  (ln (pt cx (- (+ RE 50))) (pt cx (+ RE 50)) "PAS-AXE")

  ;; =========== COTES ===========
  (setvar "CLAYER" "PAS-COTES")
  (dimL (pt 0 (- R)) (pt LT (- R)) (pt (/ LT 2) (- (+ RE 160))))
  (dimL (pt 0 (- R)) (pt MAN (- R)) (pt (/ MAN 2) (- (+ RE 80))))
  (dimL (pt MAN (- RE)) (pt (+ MAN L) (- RE)) (pt (+ MAN (/ L 2)) (- (+ RE 80))))
  (dimL (pt (+ MAN L) (- R)) (pt LT (- R)) (pt (- LT (/ MAN 2)) (- (+ RE 80))))
  (dimV (pt 0 (- R)) (pt 0 R) (pt -120 0) "%%c<>")
  (dimV (pt (+ MAN L) (- RE)) (pt (+ MAN L) RE) (pt (+ LT 150) 0) "%%c<>")
  (dimV (pt (+ MAN (/ L 2)) R) (pt (+ MAN (/ L 2)) RE)
        (pt (+ MAN (/ L 2) 80) (/ (+ R RE) 2)) nil)
  (command "_.DIMDIAMETER" (list cRE (polar (pt cx 0) (/ pi 4) RE))
           (polar (pt cx 0) (/ pi 4) (+ RE 150)))
  (command "_.DIMDIAMETER" (list cR (polar (pt cx 0) (- (/ pi 6)) R))
           (polar (pt cx 0) (- (/ pi 6)) (* R 0.35)))

  ;; =========== TITRES / NOMENCLATURE ===========
  (tx "COUPE LONGITUDINALE A-A" (pt (/ LT 2) (+ RE 90)) 35 "PAS-TEXTE" T)
  (tx "VUE DE BOUT" (pt cx (+ RE 90)) 35 "PAS-TEXTE" T)
  (setq yN (- (+ RE 330))
        lignes (list
          (strcat "PIEGE A SON CIRCULAIRE  DN " (rtos DN 2 0) " - L " (rtos L 2 0) " mm")
          "1 - Enveloppe tole acier galvanise ep. 0,8 mm"
          (strcat "2 - Tube interieur tole perforee galva %%c" (rtos DN 2 0)
                  " (trous %%c3 mm, ~30 % de vide)")
          (strcat "3 - Laine minerale ep. " (rtos EP 2 0) " mm, 40 kg/m3, voile de verre anti-defibrage")
          (strcat "4 - Manchettes %%c" (rtos DN 2 0) " L " (rtos MAN 2 0) " mm, joint EPDM double levre")
          "5 - Flasques d'extremite tole galva"
          "Cotes en mm - Echelle 1:10")
        i 0)
  (foreach s lignes
    (tx s (pt 0 (- yN (* i 40))) (if (= i 0) 30 22) "PAS-TEXTE" nil)
    (setq i (1+ i)))
  (pl (list (pt -30 (+ yN 50)) (pt (+ cx RE 100) (+ yN 50))
            (pt (+ cx RE 100) (- yN 290)) (pt -30 (- yN 290))) "PAS-CONTOUR")

  (foreach v oldvars (setvar (car v) (cdr v)))
  (command "_.ZOOM" "_E")
  (princ (strcat "\nPiege a son DN" (rtos DN 2 0) " dessine."))
  (princ))

(princ "\nPAS_circulaire charge - tapez PAS pour dessiner le piege a son.")
(princ)
