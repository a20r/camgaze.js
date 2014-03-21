
all: paper

paper: presentations/euysra/pres.tex;
	@cd presentations/euysra; pdflatex pres.tex; pdflatex pres.tex; pdflatex pres.tex; cd ../../;

