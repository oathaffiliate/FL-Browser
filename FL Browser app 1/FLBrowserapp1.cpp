#include "FLBrowserapp1.h"



FLBrowserapp1::FLBrowserapp1(QWidget* parent)
	: QMainWindow(parent)
{
	//size of the program
	resize(360, 500);

	

	// this is the text you see at the top
	QLabel* label = new QLabel(this);
	label->setText("File Browser\n--Files: ");

	// this is the text us ee on top of the second window
	widget = new QDockWidget(tr("Secondary Window: "), this);

	// 
	files = new QFileSystemModel;
	files->setRootPath("C:/Users/drewo/OneDrive/Desktop/oath/oth/cook/kits");

	// links the desired file
//this is temporary make sure to change this for final launch
	yourTreeView = new QTreeView(this);
	yourTreeView->setModel(files);
	yourTreeView->setRootIndex(files->index("C:/Users/drewo/OneDrive/Desktop/oath/oth/cook/kits"));
	
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
	vidPlayer->hide();
	player->setVideoOutput(vidPlayer);

	connect(player, &QMediaPlayer::playbackStateChanged, this, &FLBrowserapp1::onPlaybackChanged);
	connect(player, &QMediaPlayer::hasVideoChanged, this, &FLBrowserapp1::onVideoAvailable);

	//hiding the unecessary info like file size
	yourTreeView->hideColumn(1);
	yourTreeView->hideColumn(3);
	yourTreeView->hideColumn(2);

	//creating a seperate preview for the audio file
	audioPreview = new QDockWidget(this);
	audioPreview->setWidget(vidPlayer);
	addDockWidget(Qt::BottomDockWidgetArea, audioPreview);
	audioPreview->hide();
	audioPreview->setFixedHeight(100);

	previewTimer = new QTimer(this);

	connect(previewTimer, &QTimer::timeout, player, &QMediaPlayer::stop);

	yourTreeView->setDragEnabled(true);
}


// this is letting the program know if a file is detected 
void FLBrowserapp1::clickedFile(const QModelIndex& index)

{
	// if the user just wants to click to the next file, this allows them to do so
	switching = true;
	player->stop();
	qDebug() << "file clicked";
	// shows the vid and audio previews
	vidPlayer->show();
	audioPreview->show();

	QString path = files->filePath(index);
	player->setSource(QUrl::fromLocalFile(path));
	player->play();
	switching = false;

	//stops audio after 6 seconds
	previewTimer->stop();

		previewTimer->stop();
		previewTimer->setSingleShot(true);
		previewTimer->start(6000);
		
}



//closes the window after its finished playing
void FLBrowserapp1::onPlaybackChanged(QMediaPlayer::PlaybackState state)

{
	if (state == QMediaPlayer::StoppedState && !switching)
	{
		// hides the video and audio previews
		vidPlayer->hide();
		audioPreview->hide();
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

FLBrowserapp1::~FLBrowserapp1()
{
}