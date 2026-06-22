#include "FLBrowserapp1.h"



FLBrowserapp1::FLBrowserapp1(QWidget* parent)
	: QMainWindow(parent)
{
	//size of the program
	resize(200, 500);

	setWindowTitle("Navigator");

	// this is the text you see at the top
	QLabel* label = new QLabel(this);
	label->setText(" ");

	// this is the text us ee on top of the second window
	widget = new QDockWidget(tr(" "), this);

	// 
	files = new QFileSystemModel;
	// link your file path here
	files->setRootPath("your file path");

	// links the desired file
//this is temporary make sure to change this for final launch
	yourTreeView = new QTreeView(this);
	yourTreeView->setModel(files);
	//link your file path here as wewell
	yourTreeView->setRootIndex(files->index("your file path");
	
	// inports the audio and video playback features
	player = new QMediaPlayer(this);

	//lets audio be played
	audioOutput = new QAudioOutput(this);
	player->setAudioOutput(audioOutput);
	
	//allows adjustment for the specific parameters
	widget->setWidget(yourTreeView);
	widget->setAllowedAreas(Qt::LeftDockWidgetArea | Qt::RightDockWidgetArea);
	addDockWidget(Qt::LeftDockWidgetArea, widget);

	//allows the program to acknowoledge when a file is pressed
	connect(yourTreeView, &QTreeView::clicked, this, &FLBrowserapp1::clickedFile);

	//allows the video to be played
	vidPlayer = new QVideoWidget();

	//hiding the inital video player window until clicked
	player->setVideoOutput(vidPlayer);

	connect(player, &QMediaPlayer::playbackStateChanged, this, &FLBrowserapp1::onPlaybackChanged);
	connect(player, &QMediaPlayer::hasVideoChanged, this, &FLBrowserapp1::onVideoAvailable);

	//hiding the unecessary info like file size
	yourTreeView->hideColumn(1);
	yourTreeView->hideColumn(3);
	yourTreeView->hideColumn(2);

	//creating a seperate preview for the audio file
	audioPreview = new QWidget;
	QVBoxLayout* previewLayout = new QVBoxLayout(audioPreview);
	previewLayout->setContentsMargins(0, 0, 0, 0);
	previewLayout->addWidget(vidPlayer);
	previewLabel = new QLabel(audioPreview);
	previewLayout->addWidget(previewLabel);
	audioPreview->hide();
	audioPreview->setFixedHeight(100);
	audioPreview->setFixedSize(250, 180);

	widget->setFeatures(QDockWidget::NoDockWidgetFeatures);

	previewTimer = new QTimer(this);

	connect(previewTimer, &QTimer::timeout, player, &QMediaPlayer::stop);

	yourTreeView->setDragEnabled(true);

	setWindowIcon(QIcon(":/appicon.ico"));

	// setWindowIcon(QIcon("C:/Users/drewo/OneDrive/Desktop/oath/oth/0/code/FL Browser app 1/FL Browser app 1/appicon.ico"));
	
	//setWindowFlags(Qt::FramelessWindowHint);

	//QWidget* centralWidget = new QWidget(this);
	//QVBoxLayout* mainLayout = new QVBoxLayout(centralWidget);
	//mainLayout->setContentsMargins(1, 1, 1, 1);
	//mainLayout->setSpacing(0);
	//mainLayout->addWidget(titleBar);
	//setCentralWidget(centralWidget);

	titleBar = new QWidget(this);
	titleBar->setFixedHeight(30);

	setStyleSheet(
		"QMainWindow { background-color: black; border: 1px solid white; }"
		"QTreeView { background-color: black; color: white; }"
		"QDockWidget { background-color: black; color: white; border: 1px solid white; }"
		"QDockWidget::title { background-color: black; color: white; padding: 4px; }"
	); 
		yourTreeView->header()->hide();

		//titleLabel = new QLabel("Navigator", titleBar);
		//minimizeBtn = new QPushButton("---", titleBar);
		//maximizeBtn = new QPushButton("□", titleBar);
		//closeBtn = new QPushButton("×", titleBar);

	//QHBoxLayout* titleLayout = new QHBoxLayout(titleBar);
		//titleLayout->addWidget(titleLabel);
		////titleLayout->addStretch();
		//titleLayout->addWidget(minimizeBtn);
		//titleLayout->addWidget(maximizeBtn);
		//titleLayout->addWidget(closeBtn);
		//titleLayout->setContentsMargins(10, 0, 5, 0);

		//connect(closeBtn, &QPushButton::clicked, this, &FLBrowserapp1::closeWindow);
		//connect(minimizeBtn, &QPushButton::clicked, this, &FLBrowserapp1::minimizeWindow);
		//connect(maximizeBtn, &QPushButton::clicked, this, &FLBrowserapp1::maximizeWindow);

		//titleLayout->setContentsMargins(0, 0, 0, 0);
		//titleLayout->setSpacing(0);

		//closeBtn->setFixedWidth(30);
		//minimizeBtn->setFixedWidth(30);
		//maximizeBtn->setFixedWidth(30);

}


// this is letting the program know if a file is detected 
void FLBrowserapp1::clickedFile(const QModelIndex& index)

{
	// if the user just wants to click to the next file, this allows them to do so
	switching = true;
	player->stop();
	qDebug() << "file clicked";
	// shows the vid and audio previews
	// vidPlayer->show();
	audioPreview->show();

	QString path = files->filePath(index);
	player->setSource(QUrl::fromLocalFile(path));
	player->play();
	switching = false;
	previewLabel->setText(QFileInfo(path).fileName());
	

	//stops audio after 6 seconds
	previewTimer->stop();

		previewTimer->stop();
		previewTimer->setSingleShot(true);
		previewTimer->start(6000);

		if (path.endsWith(".wav") || path.endsWith(".mp3"))
		{
			vidPlayer->hide();
		}
		else
		{
			vidPlayer->show();
		}
		
}



//closes the window after its finished playing
void FLBrowserapp1::onPlaybackChanged(QMediaPlayer::PlaybackState state)

{
	if (state == QMediaPlayer::StoppedState && !switching)
	{
		// hides the video and audio previews
		// audioPreview->hide();
	}
}

//snaps it to its default size
void FLBrowserapp1::onVideoAvailable(bool available)

{
	if (available)
	{
		vidPlayer->resize(vidPlayer->sizeHint());
	}
}


void FLBrowserapp1::minimizeWindow()
{
	showMinimized();
}

void FLBrowserapp1::maximizeWindow()
{
	showMaximized();
}

void FLBrowserapp1::closeWindow()
{
	close();
}

FLBrowserapp1::~FLBrowserapp1()


{
}